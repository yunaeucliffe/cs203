package com.silverroute.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.Test;
import com.silverroute.exception.RouteDataUnavailableException;

class OneMapServiceTests {
    private final OneMapService service = new OneMapService();

    @Test
    void decodesPolylineWithNegativeCoordinateDeltas() {
        assertThat(OneMapService.decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@"))
                .containsExactly(List.of(38.5, -120.2), List.of(40.7, -120.95), List.of(43.252, -126.453));
    }

    @Test
    void rejectsTruncatedGeometry() {
        assertThatThrownBy(() -> OneMapService.decodePolyline("_p~iF"))
                .isInstanceOf(RouteDataUnavailableException.class);
    }

    @Test
    void parsesSummaryDistancesAndSeparateLegPaths() throws Exception {
        var routes = service.parseRoutes("""
                {"plan":{"itineraries":[{
                  "duration":1080,"walkTime":360,"walkDistance":400,"transfers":1,
                  "legs":[
                    {"mode":"WALK","distance":200,"legGeometry":{"points":"_p~iF~ps|U_ulLnnqC"}},
                    {"mode":"BUS","distance":800},
                    {"mode":"WALK","distance":200,"legGeometry":{"points":"_p~iF~ps|U_ulLnnqC"}}
                  ]
                }]}}
                """);
        assertThat(routes).hasSize(1);
        var route = routes.getFirst();
        assertThat(route.summary()).isEqualTo("WALK → BUS → WALK");
        assertThat(route.durationMinutes()).isEqualTo(18);
        assertThat(route.walkingMinutes()).isEqualTo(6);
        assertThat(route.distanceMeters()).isEqualTo(1200);
        assertThat(route.walkingDistanceMeters()).isEqualTo(400);
        assertThat(route.routePaths()).hasSize(2);
    }

    @Test
    void missingGeometryAndDistanceAreNotInvented() throws Exception {
        var route = service.parseRoutes("""
                {"plan":{"itineraries":[{"duration":60,"legs":[{"mode":"WALK"}]}]}}
                """).getFirst();
        assertThat(route.routePaths()).isEmpty();
        assertThat(route.distanceMeters()).isNull();
        assertThat(route.walkingDistanceMeters()).isNull();
        assertThat(service.parseRoutes("{\"plan\":{\"itineraries\":[]}}" )).isEmpty();
    }

    @Test
    void reportsMissingLocationsAndProviderErrors() {
        assertThatThrownBy(() -> service.parseLocation("{\"results\":[]}"))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("Location not found");
        assertThatThrownBy(() -> service.parseRoutes("{\"error\":\"No path\"}"))
                .isInstanceOf(RouteDataUnavailableException.class);
    }
}
