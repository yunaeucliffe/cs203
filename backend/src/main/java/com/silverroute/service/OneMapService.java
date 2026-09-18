package com.silverroute.service;

import java.util.*;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.silverroute.api.RouteOption;

@Service
public class OneMapService {

    @Value("${ONEMAP_EMAIL}")
    private String email;

    @Value("${ONEMAP_PASSWORD}")
    private String password;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public OneMapService() {
        restClient = RestClient.builder()
                .baseUrl("https://www.onemap.gov.sg")
                .build();

        objectMapper = new ObjectMapper();
    }

    public String getToken() {

        Map<String, Object> response = restClient.post()
                .uri("/api/auth/post/getToken")
                .header("Content-Type", "application/json")
                .body("""
                        {
                            "email": "%s",
                            "password": "%s"
                        }
                        """.formatted(email, password))
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {
                });

        return response.get("access_token").toString();
    }

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

    public String getRoute(
            double originLat,
            double originLon,
            double destinationLat,
            double destinationLon) {

        String token = getToken();

        return restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/public/routingsvc/route")
                        .queryParam("start", originLat + "," + originLon)
                        .queryParam("end", destinationLat + "," + destinationLon)
                        .queryParam("routeType", "pt")
                        .queryParam("date", "09-18-2026")
                        .queryParam("time", "12:30:00")
                        .queryParam("mode", "transit")
                        .queryParam("numItineraries", "3")
                        .build())
                .header("Authorization", token)
                .retrieve()
                .body(String.class);
    }

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

}
