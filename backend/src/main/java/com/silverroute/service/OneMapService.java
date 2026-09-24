package com.silverroute.service;

import java.time.Instant;
import java.util.*;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.silverroute.api.RouteOption;
import com.silverroute.api.LocationResult;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;

// Communicates with OneMap API
@Service
public class OneMapService {

    @Value("${ONEMAP_EMAIL}")
    private String email;

    @Value("${ONEMAP_PASSWORD}")
    private String password;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final Object tokenLock = new Object();

    // OneMap supplies the exact expiry time with each token 
    // The cache is kept for the lifetime of this application instance
    private volatile CachedToken cachedToken;
    private static final long TOKEN_REFRESH_BUFFER_SECONDS = 60;

    public OneMapService() {
        restClient = RestClient.builder()
                .baseUrl("https://www.onemap.gov.sg")
                .build();

        objectMapper = new ObjectMapper();
    }

    // Returns the cached OneMap access token, refreshing it only when it is near expiry
    public String getToken() {
        CachedToken token = cachedToken;
        if (isUsable(token)) {
            return token.value();
        }

        // Avoid multiple simultaneous requests all generating a new token
        synchronized (tokenLock) {
            token = cachedToken;
            if (isUsable(token)) {
                return token.value();
            }

            cachedToken = requestToken();
            return cachedToken.value();
        }
    }

    private CachedToken requestToken() {
        Map<String, Object> response = restClient.post()
                .uri("/api/auth/post/getToken")
                .header("Content-Type", "application/json")
                .body(Map.of("email", email, "password", password))
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {
                });

        if (response == null || response.get("access_token") == null || response.get("expiry_timestamp") == null) {
            throw new IllegalStateException("OneMap token response did not include an access token and expiry timestamp");
        }

        try {
            String accessToken = response.get("access_token").toString();
            long expiryEpochSeconds = Long.parseLong(response.get("expiry_timestamp").toString());
            return new CachedToken(accessToken, Instant.ofEpochSecond(expiryEpochSeconds));
        } catch (NumberFormatException exception) {
            throw new IllegalStateException("OneMap returned an invalid token expiry timestamp", exception);
        }
    }

    private boolean isUsable(CachedToken token) {
        return token != null
                && Instant.now().plusSeconds(TOKEN_REFRESH_BUFFER_SECONDS).isBefore(token.expiresAt());
    }

    private static class CachedToken {
        private final String value;
        private final Instant expiresAt;

        private CachedToken(String value, Instant expiresAt) {
            this.value = value;
            this.expiresAt = expiresAt;
        }

        private String value() {
            return value;
        }

        private Instant expiresAt() {
            return expiresAt;
        }
    }

    // Searches a place name --> gets raw JSON
    public String searchLocation(String query) {

        String token = getToken();

        return restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/common/elastic/search")
                        .queryParam("searchVal", query)
                        .queryParam("returnGeom", "Y")
                        .queryParam("getAddrDetails", "Y")
                        .build())
                .header("Authorization", token)
                .retrieve()
                .body(String.class);
    }

    // Sends coordinates to OneMap --> gets raw route JSON
    public String getRoute(double originLat, double originLon, double destinationLat, double destinationLon,
            OffsetDateTime departureTime) {

        String token = getToken();

        // Temporary url
        return restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/public/routingsvc/route")
                        .queryParam("start", originLat + "," + originLon)
                        .queryParam("end", destinationLat + "," + destinationLon)
                        .queryParam("routeType", "pt")
                        .queryParam("date", departureTime.format(
                                DateTimeFormatter.ofPattern("MM-dd-yyyy")))
                        .queryParam("time", departureTime.toLocalTime().format(
                                DateTimeFormatter.ofPattern("HH:mm:ss")))
                        .queryParam("mode", "transit")
                        .queryParam("numItineraries", "3")
                        .build())
                .header("Authorization", token)
                .retrieve()
                .body(String.class);
    }

    // Extracts useful route information --> turns it into "RouteOptions" format
    public List<RouteOption> parseRoutes(String json) throws Exception {

        JsonNode root = objectMapper.readTree(json);
        JsonNode itineraries = root.path("plan").path("itineraries");
        List<RouteOption> routes = new ArrayList<>();

        for (int i = 0; i < itineraries.size(); i++) {
            JsonNode itinerary = itineraries.get(i);
            int durationMinutes = (int) Math.round(itinerary.path("duration").asDouble() / 60);
            int walkingMinutes = (int) Math.round(itinerary.path("walkTime").asDouble() / 60);
            int transfers = itinerary.path("transfers").asInt();
            String summary = buildRouteSummary(itinerary);

            routes.add(new RouteOption(
                    "onemap-route-" + (i + 1),
                    summary,
                    durationMinutes,
                    walkingMinutes,
                    transfers,
                    false));
        }

        return routes;
    }

    // Creates summary, e.g. WALK -> BUS -> WALK
    private String buildRouteSummary(JsonNode itinerary) {
        List<String> modes = new ArrayList<>();
        for (JsonNode leg : itinerary.path("legs")) {
            String mode = leg.path("mode").asText();
            if (!modes.contains(mode)) {
                modes.add(mode);
            }
        }
        return String.join(" → ", modes);
    }

    // OneMap response contains address, latitude, longitude
    // Take first search result
    // Get its latitude
    // Turn it into own Java object
    public LocationResult parseLocation(String json) throws Exception {

        JsonNode root = objectMapper.readTree(json);
        JsonNode results = root.path("results");

        if (!results.isArray() || results.isEmpty()) {
            throw new IllegalArgumentException("Location not found");
        }

        JsonNode firstResult = results.get(0);
        String name = firstResult.path("ADDRESS").asText();
        double latitude = firstResult.path("LATITUDE").asDouble();
        double longitude = firstResult.path("LONGITUDE").asDouble();

        return new LocationResult(
                name,
                latitude,
                longitude);
    }

}