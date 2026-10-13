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
import com.silverroute.api.LocationSuggestion;

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
        restClient = com.silverroute.routing.ProviderHttp.client("https://www.onemap.gov.sg", 15);

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

        departureTime = singaporeDeparture(departureTime);
        final OffsetDateTime localDeparture = departureTime;
        // OneMap expects a Singapore local date and time.
        return restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/public/routingsvc/route")
                        .queryParam("start", originLat + "," + originLon)
                        .queryParam("end", destinationLat + "," + destinationLon)
                        .queryParam("routeType", "pt")
                        .queryParam("date", localDeparture.format(
                                DateTimeFormatter.ofPattern("MM-dd-yyyy")))
                        .queryParam("time", localDeparture.toLocalTime().format(
                                DateTimeFormatter.ofPattern("HH:mm:ss")))
                        .queryParam("mode", "transit")
                        .queryParam("numItineraries", "3")
                        .build())
                .header("Authorization", token)
                .retrieve()
                .body(String.class);
    }

    public static OffsetDateTime singaporeDeparture(OffsetDateTime value) {
        return value.atZoneSameInstant(java.time.ZoneId.of("Asia/Singapore")).toOffsetDateTime();
    }

    // Extracts useful route information --> turns it into "RouteOptions" format
    public List<RouteOption> parseRoutes(String json) throws Exception {

        return new com.silverroute.routing.RouteParser().parse(json);
    }

    // Preserve provider ranking while skipping malformed and duplicate results.
    public List<LocationSuggestion> parseSuggestions(String json) throws Exception {
        JsonNode results = objectMapper.readTree(json).path("results");
        if (!results.isArray()) throw new IllegalArgumentException("Invalid location search response");
        var suggestions = new ArrayList<LocationSuggestion>();
        var seen = new HashSet<String>();
        for (JsonNode result : results) {
            String address = result.path("ADDRESS").asText("").trim();
            String building = result.path("BUILDING").asText("").trim();
            String name = building.isBlank() || building.equalsIgnoreCase("NIL")
                    || building.equalsIgnoreCase("null") ? address : building;
            try {
                double latitude = Double.parseDouble(result.path("LATITUDE").asText());
                double longitude = Double.parseDouble(result.path("LONGITUDE").asText());
                if (name.isBlank() || !Double.isFinite(latitude) || !Double.isFinite(longitude)
                        || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) continue;
                String key = address.toLowerCase(Locale.ROOT) + ":" + latitude + ":" + longitude;
                if (seen.add(key)) suggestions.add(new LocationSuggestion(
                        name, address, latitude, longitude));
                if (suggestions.size() == 5) break;
            } catch (NumberFormatException ignored) {
                // A malformed provider result must not hide other usable matches.
            }
        }
        return suggestions;
    }

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
        double latitude;
        double longitude;
        try {
            latitude = Double.parseDouble(firstResult.path("LATITUDE").asText());
            longitude = Double.parseDouble(firstResult.path("LONGITUDE").asText());
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("Location coordinates are unavailable");
        }
        if (!Double.isFinite(latitude) || !Double.isFinite(longitude)
                || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
            throw new IllegalArgumentException("Location coordinates are invalid");
        }

        return new LocationResult(
                name,
                latitude,
                longitude);
    }

}
