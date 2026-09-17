package com.silverroute.service;

import java.util.Map;
import org.springframework.core.ParameterizedTypeReference;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class OneMapService {

    @Value("${ONEMAP_EMAIL}")
    private String email;

    @Value("${ONEMAP_PASSWORD}")
    private String password;

    private final RestClient restClient;

    public OneMapService() {
        restClient = RestClient.builder()
                .baseUrl("https://www.onemap.gov.sg")
                .build();
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
}