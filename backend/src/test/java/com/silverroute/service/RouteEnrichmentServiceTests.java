package com.silverroute.service;

import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.silverroute.api.RouteOption;
import com.silverroute.routing.*;

class RouteEnrichmentServiceTests {
    private final Clock clock=Clock.fixed(Instant.parse("2026-09-28T00:00:00Z"),ZoneOffset.UTC);
    private final LtaDataMallService lta=mock(LtaDataMallService.class);
    private final WeatherService weather=mock(WeatherService.class);
    private final CoveredLinkwayService covered=mock(CoveredLinkwayService.class);
    private final EvidenceCache cache=new EvidenceCache(clock);
    private final ShelterEstimator shelter=new ShelterEstimator(covered,cache,10);
    private final RouteEnrichmentService service=new RouteEnrichmentService(lta,weather,cache,shelter,clock);

    @Test void matchesBusAndNearbyRainAndFetchesEachStopOnlyOnce() throws Exception {
        when(lta.getBusArrivals("01234")).thenReturn(TestRoutes.fixture("bus-arrivals"));
        when(weather.getRainfall()).thenReturn(TestRoutes.fixture("rainfall"));
        when(covered.getGeoJson()).thenReturn(TestRoutes.fixture("linkways"));
        Map<String,EvidenceCache.Snapshot> local=new HashMap<>();
        var result=service.enrich(TestRoutes.route(),true,local);
        service.enrich(TestRoutes.route(),true,local);
        verify(lta,times(1)).getBusArrivals("01234"); verify(weather,times(1)).getRainfall(); verify(covered,times(1)).getGeoJson();
        var json=new ObjectMapper().writeValueAsString(result.evidence());
        assertThat(json).contains("SEA","2.4","S1").doesNotContain("S2","\"service\":\"99\"");
        assertThat(result.estimatedShelteredWalkingMeters()).isBetween(10.0,12.0);
        assertThat(result.accessibility()).isEqualTo("unknown");
    }
    @Test void partialOutagesPreserveRouteAndNeverTurnIntoZeroRainOrShelter() throws Exception {
        when(lta.getBusArrivals(anyString())).thenThrow(new IllegalStateException("secret diagnostics"));
        when(weather.getRainfall()).thenThrow(new IllegalStateException("outage"));
        when(covered.getGeoJson()).thenThrow(new IllegalStateException("outage"));
        var result=service.enrich(TestRoutes.route(),true,new HashMap<>());
        assertThat(result.durationMinutes()).isEqualTo(23);
        assertThat(result.estimatedShelteredWalkingMeters()).isNull();
        assertThat(result.evidence()).allMatch(e -> e.availability().equals("unavailable"));
        assertThat(result.warnings().toString()).doesNotContain("secret diagnostics");
    }
    @Test void excludesLiveEvidenceForLaterDepartures() throws Exception {
        when(covered.getGeoJson()).thenReturn(TestRoutes.fixture("linkways"));
        var result=service.enrich(TestRoutes.route(),false,new HashMap<>());
        verifyNoInteractions(lta,weather);
        assertThat(result.evidence()).extracting(RouteEvidence::source).containsExactly("LTA CoveredLinkWay");
    }
    @Test void staleRainIsUnknown() throws Exception {
        String stale=TestRoutes.fixture("rainfall").replace("2026-09-28T08:00:00+08:00","2026-09-27T08:00:00+08:00");
        when(weather.getRainfall()).thenReturn(stale);
        var result=service.enrich(TestRoutes.route(),true,new HashMap<>());
        assertThat(result.evidence()).filteredOn(e -> e.source().equals("NEA Rainfall")).allMatch(e -> e.availability().equals("unavailable"));
    }
    @Test void matchesRailEvidenceToStationsAndLines() throws Exception {
        var source=TestRoutes.route();
        var leg=new RouteLeg("SUBWAY","EWL",new RouteLeg.Stop("2:EW24/NS1",null,"Jurong East MRT",1.3,103.8),
                new RouteLeg.Stop("2:EW25",null,"Chinese Garden",1.31,103.81),1200.0,1000.0,null,null,List.of());
        var rail=new RouteOption("rail","MRT",20,0,0,"unknown",0.0,1000.0,null,List.of(leg),List.of(),List.of(),List.of(),List.of());
        when(lta.getFacilitiesMaintenance()).thenReturn(TestRoutes.fixture("facilities"));
        when(lta.getTrainServiceAlerts()).thenReturn(TestRoutes.fixture("train-alerts"));
        when(lta.getStationCrowdDensity("EWL")).thenReturn(TestRoutes.fixture("crowding"));
        var result=service.enrich(rail,true,new HashMap<>());
        String evidence=new ObjectMapper().writeValueAsString(result.evidence());
        assertThat(evidence).contains("Concourse lift","EW24","CrowdLevel","matchingSegments").doesNotContain("Unrelated","NE1","EW1\"");
        verify(lta,times(1)).getStationCrowdDensity("EWL");
        verify(lta,never()).getStationCrowdDensity("NSL");
    }
    @Test void matchesFallbackStopByUniqueNameAndCoordinates() throws Exception {
        var root=new ObjectMapper().readTree(TestRoutes.fixture("onemap"));
        var stop=(ObjectNode)root.at("/plan/itineraries/0/legs/1/from"); stop.remove(List.of("stopId","stopCode"));
        when(lta.getBusStops(0)).thenReturn("{\"value\":[{\"BusStopCode\":\"01234\",\"Description\":\"Test Stop\",\"Latitude\":1.3001,\"Longitude\":103.8}]}");
        when(lta.getBusArrivals("01234")).thenReturn(TestRoutes.fixture("bus-arrivals"));
        service.enrich(new RouteParser().parse(root.toString()).getFirst(),true,new HashMap<>());
        verify(lta).getBusArrivals("01234");
    }
}
