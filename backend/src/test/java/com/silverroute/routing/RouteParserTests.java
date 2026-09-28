package com.silverroute.routing;

import java.time.OffsetDateTime;
import java.util.List;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import com.silverroute.service.OneMapService;

class RouteParserTests {
    @Test void retainsOrderedLegsAndUnknownAccessibility() throws Exception {
        var route=TestRoutes.route();
        assertThat(route.durationMinutes()).isEqualTo(23);
        assertThat(route.walkingMinutes()).isEqualTo(3);
        assertThat(route.walkingDistanceMeters()).isEqualTo(22);
        assertThat(route.accessibility()).isEqualTo("unknown");
        assertThat(route.legs()).extracting(RouteLeg::mode).containsExactly("WALK","BUS","WALK");
        assertThat(route.legs().get(1).from().id()).isEqualTo("1:01234");
        assertThat(route.routePaths().getFirst().getFirst()).containsExactly(1.3,103.8);
        assertThat(route.summary()).isEqualTo("WALK → BUS 97 → WALK");
    }
    @Test void missingMetricsRemainUnknownAndBadGeometryDoesNotRemoveRoute() throws Exception {
        var root=new ObjectMapper().readTree(TestRoutes.fixture("onemap"));
        var itinerary=(ObjectNode)root.path("plan").path("itineraries").get(0);
        itinerary.remove(List.of("duration","walkTime","transfers","walkDistance"));
        ((ObjectNode)itinerary.path("legs").get(0)).remove("distance");
        ((ObjectNode)itinerary.path("legs").get(0).path("legGeometry")).put("points","?");
        var route=new RouteParser().parse(root.toString()).getFirst();
        assertThat(route.durationMinutes()).isNull();
        assertThat(route.walkingMinutes()).isNull();
        assertThat(route.walkingDistanceMeters()).isNull();
        assertThat(route.transfers()).isNull();
        assertThat(route.legs().getFirst().path()).isEmpty();
        assertThat(route.warnings()).anyMatch(w -> w.contains("invalid map geometry"));
    }
    @Test void absentWalkingLegsAndMetricsDoNotImplyZeroWalking() throws Exception {
        var root=new ObjectMapper().readTree(TestRoutes.fixture("onemap"));
        var itinerary=(ObjectNode)root.at("/plan/itineraries/0");
        itinerary.remove(List.of("walkTime","walkDistance"));
        var legs=(com.fasterxml.jackson.databind.node.ArrayNode)itinerary.path("legs");
        var bus=legs.get(1); legs.removeAll(); legs.add(bus);
        assertThat(new RouteParser().parse(root.toString()).getFirst().walkingDistanceMeters()).isNull();
    }
    @Test void rejectsErrorResponsesAndHandlesNoItineraries() throws Exception {
        assertThatThrownBy(() -> new RouteParser().parse("{\"error\":\"unavailable\"}")).isInstanceOf(IllegalArgumentException.class);
        assertThat(new RouteParser().parse("{\"plan\":{\"itineraries\":[]}}")).isEmpty();
    }
    @Test void normalizesUtcAcrossMidnight() {
        assertThat(OneMapService.singaporeDeparture(OffsetDateTime.parse("2026-09-27T20:00:00Z")))
                .isEqualTo(OffsetDateTime.parse("2026-09-28T04:00:00+08:00"));
    }
    @Test void modelContextExcludesGeometryAndIdentity() throws Exception {
        String json=new ObjectMapper().writeValueAsString(TestRoutes.trip().context());
        assertThat(json).contains("walkingTolerance","01234").doesNotContain("routePaths","latitude","password","email","username","userId");
    }
}
