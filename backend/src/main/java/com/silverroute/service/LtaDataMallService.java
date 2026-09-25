package com.silverroute.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.util.StringJoiner;

@Service
public class LtaDataMallService {

    private final RestClient restClient;
    private final RestClient downloadClient = RestClient.create();
    private final ObjectMapper objectMapper = new ObjectMapper();

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

    /**
     * Fetches LTA's latest Covered Link Way shapefile ZIP.
     * DataMall first returns a short-lived download link, so the link must be
     * followed immediately. The ZIP contains SHP data, not GeoJSON.
     */
    public byte[] getCoveredLinkwayShapefile() throws Exception {
        String response = restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/ltaodataservice/GeospatialWholeIsland")
                        .queryParam("ID", "CoveredLinkWay")
                        .build())
                .header("AccountKey", apiKey)
                .retrieve()
                .body(String.class);

        JsonNode root = objectMapper.readTree(response);
        JsonNode linkNode = root.path("Link");
        if (linkNode.isMissingNode() || linkNode.isNull()) {
            JsonNode values = root.path("value");
            if (values.isArray() && !values.isEmpty()) {
                linkNode = values.get(0).path("Link");
            }
        }
        String downloadUrl = linkNode.asText();
        if (downloadUrl.isBlank()) {
            StringJoiner fieldNames = new StringJoiner(", ");
            root.fieldNames().forEachRemaining(fieldNames::add);
            throw new IllegalStateException("DataMall response did not include a shapefile download link; response fields: "
                    + fieldNames);
        }

        return downloadClient.get()
                .uri(URI.create(downloadUrl))
                .retrieve()
                .body(byte[].class);
    }
}
