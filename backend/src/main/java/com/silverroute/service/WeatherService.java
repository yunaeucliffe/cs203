package com.silverroute.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class WeatherService {

    private final RestClient restClient;

    public WeatherService() {
        restClient = com.silverroute.routing.ProviderHttp.client("https://api-open.data.gov.sg/v2/real-time/api", 10);
    }

    public String getRainfall() {

        return restClient.get()
                .uri("/rainfall")
                .retrieve()
                .body(String.class);
    }
}
