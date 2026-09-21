package com.silverroute.service;

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
import java.time.ZoneId;
import com.silverroute.exception.RouteDataUnavailableException;
import java.time.format.DateTimeFormatter;

// Communicates with OneMap API
@Service
public class OneMapService {

    @Value("${ONEMAP_EMAIL:}")
    private String email;

    @Value("${ONEMAP_PASSWORD:}")
    private String password;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public OneMapService() {
        restClient = RestClient.builder()
                .baseUrl("https://www.onemap.gov.sg")
                .build();

        objectMapper = new ObjectMapper();
    }

    // Gets OneMap access token
    public String getToken() {

        if (email.isBlank() || password.isBlank()) {
            throw new RouteDataUnavailableException(
                    "Route search is not configured. Set ONEMAP_EMAIL and ONEMAP_PASSWORD in the backend environment.");
        }

        Map<String, Object> response = restClient.post()
                .uri("/api/auth/post/getToken")
                .header("Content-Type", "application/json")
                .body(Map.of("email", email, "password", password))
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {
                });

        if (response == null || response.get("access_token") == null) {
            throw new RouteDataUnavailableException("OneMap authentication failed. Check the backend credentials.");
        }
        return response.get("access_token").toString();
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

        // OneMap expects the departure date and time in Singapore local time.
        var singaporeTime = departureTime.atZoneSameInstant(ZoneId.of("Asia/Singapore"));
        return restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/public/routingsvc/route")
                        .queryParam("start", originLat + "," + originLon)
                        .queryParam("end", destinationLat + "," + destinationLon)
                        .queryParam("routeType", "pt")
                        .queryParam("date", singaporeTime.format(
                                DateTimeFormatter.ofPattern("MM-dd-yyyy")))
                        .queryParam("time", singaporeTime.toLocalTime().format(
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
        if (root.hasNonNull("error")) {
            throw new RouteDataUnavailableException("OneMap could not find a route for this journey.");
        }
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
                    false,
                    totalDistance(itinerary),
                    itinerary.hasNonNull("walkDistance") ? itinerary.path("walkDistance").asDouble() : null,
                    routePaths(itinerary)));
        }

        return routes;
    }

    // Creates summary, e.g. WALK -> BUS -> WALK
    private String buildRouteSummary(JsonNode itinerary) {
        List<String> modes = new ArrayList<>();
        for (JsonNode leg : itinerary.path("legs")) {
            String mode = leg.path("mode").asText();
            if (!mode.isBlank() && (modes.isEmpty() || !modes.getLast().equals(mode))) {
                modes.add(mode);
            }
        }
        return String.join(" → ", modes);
    }

    private Double totalDistance(JsonNode itinerary) {
        double total = 0;
        if (itinerary.path("legs").isEmpty()) return null;
        for (JsonNode leg : itinerary.path("legs")) {
            if (!leg.hasNonNull("distance")) return null;
            total += leg.path("distance").asDouble();
        }
        return total;
    }

    private List<List<List<Double>>> routePaths(JsonNode itinerary) {
        List<List<List<Double>>> paths = new ArrayList<>();
        for (JsonNode leg : itinerary.path("legs")) {
            String encoded = leg.path("legGeometry").path("points").asText("");
            if (!encoded.isBlank()) {
                paths.add(decodePolyline(encoded));
            }
        }
        return paths;
    }

    // OneMap leg geometry uses encoded polylines at 5 decimal places.
    static List<List<Double>> decodePolyline(String encoded) {
        List<List<Double>> points = new ArrayList<>();
        int[] cursor = {0};
        int latitude = 0;
        int longitude = 0;
        while (cursor[0] < encoded.length()) {
            latitude += decodeDelta(encoded, cursor);
            longitude += decodeDelta(encoded, cursor);
            points.add(List.of(latitude / 100000.0, longitude / 100000.0));
        }
        return points;
    }

    private static int decodeDelta(String encoded, int[] cursor) {
        int value = 0;
        int shift = 0;
        int part;
        do {
            if (cursor[0] >= encoded.length() || shift > 30) {
                throw new RouteDataUnavailableException("OneMap returned invalid route geometry.");
            }
            part = encoded.charAt(cursor[0]++) - 63;
            if (part < 0 || part > 63) {
                throw new RouteDataUnavailableException("OneMap returned invalid route geometry.");
            }
            value |= (part & 31) << shift;
            shift += 5;
        } while (part >= 32);
        return (value & 1) != 0 ? ~(value >>> 1) : value >>> 1;
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
