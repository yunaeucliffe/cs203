package com.silverroute;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.OffsetDateTime;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.silverroute.service.OneMapService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(RouteSearchIntegrationTests.ProviderFixture.class)
class RouteSearchIntegrationTests {
    @LocalServerPort
    private int port;

    @Test
    void locationAndRouteEndpointsReturnTheFrontendContract() throws Exception {
        var location = get("/api/location/parsed?query=Tampines%20Mall");
        assertThat(location.statusCode()).isEqualTo(200);
        var mapper = new ObjectMapper();
        var target = mapper.readTree(location.body());
        assertThat(target.path("name").asText()).isEqualTo("TAMPINES MALL");
        assertThat(target.path("latitude").asDouble()).isEqualTo(1.3521);

        var response = get("/api/route/parsed?originLat=1.3&originLon=103.8"
                + "&destinationLat=1.3521&destinationLon=103.8198"
                + "&departureTime=2026-09-21T06%3A00%3A00Z");
        assertThat(response.statusCode()).isEqualTo(200);
        var route = mapper.readTree(response.body()).get(0);
        assertThat(route.path("durationMinutes").asInt()).isEqualTo(18);
        assertThat(route.path("distanceMeters").asDouble()).isEqualTo(1200);
        assertThat(route.path("routePaths").get(0).get(0).get(0).asDouble()).isEqualTo(38.5);
        assertThat(route.path("routePaths").get(0).get(0).get(1).asDouble()).isEqualTo(-120.2);
    }

    @Test
    void unknownLocationReturnsAnActionableClientError() throws Exception {
        var response = get("/api/location/parsed?query=unknown");
        assertThat(response.statusCode()).isEqualTo(400);
        assertThat(response.body()).contains("Location not found");
    }

    private HttpResponse<String> get(String path) throws Exception {
        return HttpClient.newHttpClient().send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).build(),
                HttpResponse.BodyHandlers.ofString());
    }

    // Replace only external calls: the real controllers and parsing still run.
    @TestConfiguration
    static class ProviderFixture {
        @Bean
        @Primary
        OneMapService fixtureOneMapService() {
            return new OneMapService() {
                @Override
                public String searchLocation(String query) {
                    if (query.equals("unknown")) return "{\"results\":[]}";
                    return """
                            {"results":[{"ADDRESS":"TAMPINES MALL","LATITUDE":"1.3521","LONGITUDE":"103.8198"}]}
                            """;
                }

                @Override
                public String getRoute(double originLat, double originLon, double destinationLat,
                        double destinationLon, OffsetDateTime departureTime) {
                    assertThat(originLat).isEqualTo(1.3);
                    assertThat(destinationLat).isEqualTo(1.3521);
                    assertThat(departureTime).isEqualTo(OffsetDateTime.parse("2026-09-21T06:00:00Z"));
                    return """
                            {"plan":{"itineraries":[{"duration":1080,"walkTime":360,
                              "transfers":1,"walkDistance":400,"legs":[{"mode":"BUS","distance":1200,
                              "legGeometry":{"points":"_p~iF~ps|U_ulLnnqC"}}]}]}}
                            """;
                }
            };
        }
    }
}
