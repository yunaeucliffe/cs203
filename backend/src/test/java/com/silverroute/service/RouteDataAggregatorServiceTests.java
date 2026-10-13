package com.silverroute.service;

import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import com.silverroute.api.*;
import com.silverroute.routing.*;
import com.silverroute.tool.*;
import com.silverroute.exception.RouteDataUnavailableException;
import com.silverroute.exception.AddressNotFoundException;
import com.silverroute.exception.InvalidAddressException;
import com.silverroute.exception.AddressConfirmationRequiredException;

class RouteDataAggregatorServiceTests {
    @Test void addressSuggestionStopsRouteAggregation() throws Exception {
        var tool=mock(RouteDataTool.class); var enrichment=mock(RouteConditionsService.class);
        var failure=new AddressConfirmationRequiredException("10 Example Road 200640",
                List.of(new LocationResult("640 ROWELL ROAD SINGAPORE 200640",1.3074,103.8547)));
        when(tool.execute(any())).thenThrow(failure);
        assertThatThrownBy(() -> new RouteDataAggregatorService(tool,enrichment).aggregate(
                new TripRequest("A","10 Example Road 200640",OffsetDateTime.now()),new SavedPreferences("Normal","Moderate",false)))
                .isSameAs(failure);
        verifyNoInteractions(enrichment);
    }
    @Test void addressLookupFailureKeepsActionableMessage() throws Exception {
        var tool=mock(RouteDataTool.class); var enrichment=mock(RouteConditionsService.class);
        when(tool.execute(any())).thenThrow(new AddressNotFoundException("Address could not be found. Try its six-digit postal code."));
        assertThatThrownBy(() -> new RouteDataAggregatorService(tool,enrichment).aggregate(
                new TripRequest("A","B",OffsetDateTime.now()),new SavedPreferences("Normal","Moderate",false)))
                .isInstanceOf(AddressNotFoundException.class).hasMessageContaining("postal code");
        verifyNoInteractions(enrichment);
    }
    @Test void invalidAddressIsNotWrappedAsProviderFailure() throws Exception {
        var tool=mock(RouteDataTool.class); var enrichment=mock(RouteConditionsService.class);
        var failure=new InvalidAddressException("Enter an address.");
        when(tool.execute(any())).thenThrow(failure);
        assertThatThrownBy(() -> new RouteDataAggregatorService(tool,enrichment).aggregate(
                new TripRequest("A","B",OffsetDateTime.now()),new SavedPreferences("Normal","Moderate",false)))
                .isSameAs(failure);
        verifyNoInteractions(enrichment);
    }
    @Test void normalizesTimeAndCollectsBeforeRankingWithFutureWarning() throws Exception {
        var tool=mock(RouteDataTool.class); var conditions=mock(RouteConditionsService.class);
        var clock=Clock.fixed(Instant.parse("2026-09-28T00:00:00Z"),ZoneOffset.UTC);
        var route=TestRoutes.route();
        when(tool.execute(any())).thenReturn(new ToolExecutionResult("OneMap",List.of(route),List.of()));
        when(conditions.attachConditions(eq(route),eq(false),anyMap())).thenReturn(route);
        var request=new TripRequest("A","B",OffsetDateTime.parse("2026-09-28T01:00:00Z"));
        var result=new RouteDataAggregatorService(tool,conditions,clock).aggregate(request,new SavedPreferences("Slow","Poor",true));
        assertThat(result.context().trip().departureTime()).isEqualTo("2026-09-28T09:00+08:00");
        assertThat(result.context().dataWarnings()).anyMatch(w -> w.contains("future or historical"));
        verify(tool).execute(new TripRequest("A","B",OffsetDateTime.parse("2026-09-28T09:00:00+08:00")));
        verify(conditions).attachConditions(eq(route),eq(false),anyMap());
    }
    @Test void noCandidatesFailsWithoutConditions() throws Exception {
        var tool=mock(RouteDataTool.class); var conditions=mock(RouteConditionsService.class);
        when(tool.execute(any())).thenReturn(new ToolExecutionResult("OneMap",List.of(),List.of()));
        assertThatThrownBy(() -> new RouteDataAggregatorService(tool,conditions).aggregate(
                new TripRequest("A","B",OffsetDateTime.now()),new SavedPreferences("Normal","Moderate",false)))
                .isInstanceOf(RouteDataUnavailableException.class);
        verifyNoInteractions(conditions);
    }
    @Test void explicitMockProfileDataNeverCallsLiveConditions() {
        var conditions=mock(RouteConditionsService.class);
        var result=new RouteDataAggregatorService(new MockRouteDataTool(),conditions).aggregate(
                new TripRequest("A","B",OffsetDateTime.now()),new SavedPreferences("Normal","Moderate",false));
        assertThat(result.routes()).hasSize(3);
        verifyNoInteractions(conditions);
    }
}
