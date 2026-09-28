package com.silverroute.tool;

import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.assertj.core.api.Assertions.*;
import com.silverroute.api.*;
import com.silverroute.service.OneMapService;
import com.silverroute.routing.TestRoutes;

class OneMapRouteDataToolTests {
    @Test void gpsCoordinatesAreUsedWithoutGeocodingCurrentLocationLabel() throws Exception {
        var service=mock(OneMapService.class);
        var time=OffsetDateTime.parse("2026-09-28T08:00:00+08:00");
        when(service.getRoute(1.3,103.8,1.31,103.81,time)).thenReturn("routes");
        when(service.parseRoutes("routes")).thenReturn(java.util.List.of(TestRoutes.route()));
        var result=new OneMapRouteDataTool(service).execute(new TripRequest("Current location","Hospital",time,
                new TripRequest.Coordinates(1.3,103.8),new TripRequest.Coordinates(1.31,103.81)));
        assertThat(result.routes()).hasSize(1);
        verify(service,never()).searchLocation(anyString());
        verify(service).getRoute(1.3,103.8,1.31,103.81,time);
    }
    @Test void namesStillWorkWithoutCoordinates() throws Exception {
        var service=mock(OneMapService.class);
        when(service.searchLocation("Origin")).thenReturn("origin-json");
        when(service.searchLocation("Destination")).thenReturn("destination-json");
        when(service.parseLocation("origin-json")).thenReturn(new LocationResult("Origin",1.3,103.8));
        when(service.parseLocation("destination-json")).thenReturn(new LocationResult("Destination",1.31,103.81));
        when(service.getRoute(anyDouble(),anyDouble(),anyDouble(),anyDouble(),any())).thenReturn("routes");
        when(service.parseRoutes("routes")).thenReturn(java.util.List.of(TestRoutes.route()));
        assertThat(new OneMapRouteDataTool(service).execute(new TripRequest("Origin","Destination",OffsetDateTime.now())).routes()).hasSize(1);
        verify(service).searchLocation("Origin"); verify(service).searchLocation("Destination");
    }
}
