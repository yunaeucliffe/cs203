package com.silverroute.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class LtaDataMallService {

    private final RestClient restClient;

    @Value("${LTA_DATAMALL_API_KEY}")
    private String apiKey;

    public LtaDataMallService() {
        this.restClient = RestClient.builder()
                .baseUrl("https://datamall2.mytransport.sg")
                .build();
    }

    public String getBusArrivals(String busStopCode) {
        return restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/ltaodataservice/v3/BusArrival")
                        .queryParam("BusStopCode", busStopCode)
                        .build())
                .header("AccountKey", apiKey)
                .retrieve()
                .body(String.class);
    }

    public String getBusStops(int skip) {
        return restClient.get()
                .uri("/ltaodataservice/BusStops?$skip={skip}", skip)
                .header("AccountKey", apiKey)
                .retrieve()
                .body(String.class);
    }

    public String getBusRoutes(int skip) {
        return restClient.get()
                .uri("/ltaodataservice/BusRoutes?$skip={skip}", skip)
                .header("AccountKey", apiKey)
                .retrieve()
                .body(String.class);
    }

    public String getBusServices(int skip) {
        return restClient.get()
                .uri("/ltaodataservice/BusServices?$skip={skip}", skip)
                .header("AccountKey", apiKey)
                .retrieve()
                .body(String.class);
    }

    public String getTrainServiceAlerts() {
        return restClient.get()
                .uri("/ltaodataservice/TrainServiceAlerts")
                .header("AccountKey", apiKey)
                .retrieve()
                .body(String.class);
    }

    public String getStationCrowdDensity(String trainLine) {
        return restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/ltaodataservice/PCDRealTime")
                        .queryParam("TrainLine", trainLine)
                        .build())
                .header("AccountKey", apiKey)
                .retrieve()
                .body(String.class);
    }

    public String getFacilitiesMaintenance() {
        return restClient.get()
                .uri("/ltaodataservice/v2/FacilitiesMaintenance")
                .header("AccountKey", apiKey)
                .retrieve()
                .body(String.class);
    }
}
