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

class RouteDataAggregatorServiceTests {
    @Test void addressLookupFailureKeepsActionableMessage() throws Exception {
        var tool=mock(RouteDataTool.class); var enrichment=mock(RouteEnrichmentService.class);
        when(tool.execute(any())).thenThrow(new RouteDataUnavailableException("Address could not be found. Try its six-digit postal code."));
        assertThatThrownBy(() -> new RouteDataAggregatorService(tool,enrichment).aggregate(
                new TripRequest("A","B",OffsetDateTime.now()),new SavedPreferences("Normal","Moderate",false)))
                .isInstanceOf(RouteDataUnavailableException.class).hasMessageContaining("postal code");
        verifyNoInteractions(enrichment);
    }
    @Test void normalizesTimeAndCollectsBeforeRankingWithFutureWarning() throws Exception {
        var tool=mock(RouteDataTool.class); var enrichment=mock(RouteEnrichmentService.class);
        var clock=Clock.fixed(Instant.parse("2026-09-28T00:00:00Z"),ZoneOffset.UTC);
        var route=TestRoutes.route();
        when(tool.execute(any())).thenReturn(new ToolExecutionResult("OneMap",List.of(route),List.of()));
        when(enrichment.enrich(eq(route),eq(false),anyMap())).thenReturn(route);
        var request=new TripRequest("A","B",OffsetDateTime.parse("2026-09-28T01:00:00Z"));
        var result=new RouteDataAggregatorService(tool,enrichment,clock).aggregate(request,new SavedPreferences("Slow","Poor",true));
        assertThat(result.context().trip().departureTime()).isEqualTo("2026-09-28T09:00+08:00");
        assertThat(result.context().dataWarnings()).anyMatch(w -> w.contains("future or historical"));
        verify(tool).execute(new TripRequest("A","B",OffsetDateTime.parse("2026-09-28T09:00:00+08:00")));
        verify(enrichment).enrich(eq(route),eq(false),anyMap());
    }
    @Test void noCandidatesFailsWithoutEnrichment() throws Exception {
        var tool=mock(RouteDataTool.class); var enrichment=mock(RouteEnrichmentService.class);
        when(tool.execute(any())).thenReturn(new ToolExecutionResult("OneMap",List.of(),List.of()));
        assertThatThrownBy(() -> new RouteDataAggregatorService(tool,enrichment).aggregate(
                new TripRequest("A","B",OffsetDateTime.now()),new SavedPreferences("Normal","Moderate",false)))
                .isInstanceOf(RouteDataUnavailableException.class);
        verifyNoInteractions(enrichment);
    }
    @Test void explicitMockProfileDataNeverCallsLiveEnrichment() {
        var enrichment=mock(RouteEnrichmentService.class);
        var result=new RouteDataAggregatorService(new MockRouteDataTool(),enrichment).aggregate(
                new TripRequest("A","B",OffsetDateTime.now()),new SavedPreferences("Normal","Moderate",false));
        assertThat(result.routes()).hasSize(3);
        verifyNoInteractions(enrichment);
    }
}
