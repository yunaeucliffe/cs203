package com.silverroute.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class WeatherService {

    private final RestClient restClient;

    public WeatherService() {
        restClient = RestClient.builder()
                .baseUrl("https://api-open.data.gov.sg/v2/real-time/api")
                .build();
    }

    public String getRainfall() {

        return restClient.get()
                .uri("/rainfall")
                .retrieve()
                .body(String.class);
    }
}
