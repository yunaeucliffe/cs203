package com.silverroute.tool;

import java.time.OffsetDateTime;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.silverroute.api.*;
import com.silverroute.routing.*;
import com.silverroute.service.OneMapService;
import com.silverroute.exception.*;

class WalkingRouteDataTests {
    final OneMapService service = mock(OneMapService.class);
    final OneMapRouteDataTool tool = new OneMapRouteDataTool(service);
    final TripRequest request = new TripRequest("A","B",OffsetDateTime.parse("2026-09-28T08:00:00+08:00"),
            new TripRequest.Coordinates(1.3195,103.84214),new TripRequest.Coordinates(1.3195,103.84218));
    SavedPreferences preferences(int limit) { return new SavedPreferences("Normal",50,20,true,limit); }
    void transit() throws Exception {
        when(service.getRoute(anyDouble(),anyDouble(),anyDouble(),anyDouble(),any())).thenReturn("pt");
        when(service.parseRoutes("pt")).thenReturn(List.of(TestRoutes.route()));
    }
    @Test void actualWalkingDistanceControlsEligibilityAndDisabledSkipsFetch() throws Exception {
        transit();
        doReturn(TestRoutes.fixture("walking")).when(service).getWalkingRoute(anyDouble(),anyDouble(),anyDouble(),anyDouble());
        assertThat(tool.execute(request,preferences(399)).routes()).noneMatch(RouteOption::isWalkingOnly);
        assertThat(tool.execute(request,preferences(400)).routes()).filteredOn(RouteOption::isWalkingOnly).hasSize(1);
        assertThat(tool.execute(request,preferences(401)).routes()).filteredOn(RouteOption::isWalkingOnly).hasSize(1);
        clearInvocations(service);
        assertThat(tool.execute(request).routes()).hasSize(1);
        verify(service,never()).getWalkingRoute(anyDouble(),anyDouble(),anyDouble(),anyDouble());
        verify(service,never()).searchLocation(anyString());
    }
    @Test void walkingFailureKeepsTransitAndTransitFailureKeepsWalking() throws Exception {
        transit();
        when(service.getWalkingRoute(anyDouble(),anyDouble(),anyDouble(),anyDouble())).thenThrow(new IllegalStateException("secret"));
        var result = tool.execute(request,preferences(500));
        assertThat(result.routes()).hasSize(1);
        assertThat(result.warnings().toString()).contains("walking-only").doesNotContain("secret");
        doReturn(TestRoutes.fixture("walking")).when(service).getWalkingRoute(anyDouble(),anyDouble(),anyDouble(),anyDouble());
        when(service.getRoute(anyDouble(),anyDouble(),anyDouble(),anyDouble(),any())).thenThrow(new RouteDataUnavailableException("No transit"));
        result = tool.execute(request,preferences(500));
        assertThat(result.routes()).singleElement().satisfies(route -> assertThat(route.isWalkingOnly()).isTrue());
        assertThat(result.warnings().toString()).contains("Public transport is unavailable");
    }
    @Test void invalidLocationsStopBeforeWalkingFallback() throws Exception {
        when(service.getRoute(anyDouble(),anyDouble(),anyDouble(),anyDouble(),any())).thenThrow(new InvalidAddressException("Outside Singapore"));
        assertThatThrownBy(() -> tool.execute(request,preferences(500))).isInstanceOf(InvalidAddressException.class);
        verify(service,never()).getWalkingRoute(anyDouble(),anyDouble(),anyDouble(),anyDouble());
    }
    @Test void duplicatesFromTransitAreCollapsedAndRejectedWhenDisabled() throws Exception {
        transit();
        var walk = parse(TestRoutes.fixture("walking"));
        when(service.parseRoutes("pt")).thenReturn(List.of(TestRoutes.route(),walk,walk));
        doReturn(TestRoutes.fixture("walking")).when(service).getWalkingRoute(anyDouble(),anyDouble(),anyDouble(),anyDouble());
        assertThat(tool.execute(request,preferences(500)).routes()).filteredOn(RouteOption::isWalkingOnly).hasSize(1);
        assertThat(tool.execute(request).routes()).noneMatch(RouteOption::isWalkingOnly);
    }
    RouteOption parse(String json) throws Exception {
        return new WalkingRouteParser().parse(json,new LocationResult("A",1.3195,103.84214),
                new LocationResult("B",1.3195,103.84218),request.departureTime());
    }
    @Test void walkingParserPreservesMetricsGeometryAndRejectsMalformedData() throws Exception {
        String json=TestRoutes.fixture("walking");
        var route=parse(json);
        assertThat(route.durationMinutes()).isEqualTo(5);
        assertThat(route.walkingDistanceMeters()).isEqualTo(400);
        assertThat(route.transfers()).isZero();
        assertThat(route.legs().getFirst().path()).hasSize(2);
        assertThat(route.legs().getFirst().path().getFirst().getFirst()).isBetween(1.3,1.4);
        for (String bad : List.of("{}", json.replace("400","null"),json.replace("300","-1"),
                json.replace("{u`GktxxR?G",""),json.replace("{u`GktxxR?G","~")))
            assertThatThrownBy(() -> parse(bad)).isInstanceOf(Exception.class);
    }
}
