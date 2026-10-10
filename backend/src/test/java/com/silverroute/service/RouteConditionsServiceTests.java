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

class RouteConditionsServiceTests {
    private final Clock clock=Clock.fixed(Instant.parse("2026-09-28T00:00:00Z"),ZoneOffset.UTC);
    private final LtaDataMallService lta=mock(LtaDataMallService.class);
    private final WeatherService weather=mock(WeatherService.class);
    private final CoveredLinkwayService covered=mock(CoveredLinkwayService.class);
    private final EvidenceCache cache=new EvidenceCache(clock);
    private final ShelterEstimator shelter=new ShelterEstimator(covered,cache,10);
    private final RouteConditionsService service=new RouteConditionsService(lta,weather,cache,shelter,clock);

    @Test void matchesBusAndNearbyRainAndFetchesEachStopOnlyOnce() throws Exception {
        when(lta.getBusArrivals("01234")).thenReturn(TestRoutes.fixture("bus-arrivals"));
        when(weather.getRainfall()).thenReturn(TestRoutes.fixture("rainfall"));
        when(covered.getGeoJson()).thenReturn(TestRoutes.fixture("linkways"));
        Map<String,EvidenceCache.Snapshot> local=new HashMap<>();
        var result=service.attachConditions(TestRoutes.route(),true,local);
        service.attachConditions(TestRoutes.route(),true,local);
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
        var result=service.attachConditions(TestRoutes.route(),true,new HashMap<>());
        assertThat(result.durationMinutes()).isEqualTo(23);
        assertThat(result.estimatedShelteredWalkingMeters()).isNull();
        assertThat(result.evidence()).allMatch(e -> e.availability().equals("unavailable"));
        assertThat(result.warnings().toString()).doesNotContain("secret diagnostics");
    }
    @Test void excludesLiveEvidenceForLaterDepartures() throws Exception {
        when(covered.getGeoJson()).thenReturn(TestRoutes.fixture("linkways"));
        var result=service.attachConditions(TestRoutes.route(),false,new HashMap<>());
        verifyNoInteractions(lta,weather);
        assertThat(result.evidence()).extracting(RouteEvidence::source).containsExactly("LTA CoveredLinkWay");
    }
    @Test void staleRainIsUnknown() throws Exception {
        String stale=TestRoutes.fixture("rainfall").replace("2026-09-28T08:00:00+08:00","2026-09-27T08:00:00+08:00");
        when(weather.getRainfall()).thenReturn(stale);
        var result=service.attachConditions(TestRoutes.route(),true,new HashMap<>());
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
        var result=service.attachConditions(rail,true,new HashMap<>());
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
        service.attachConditions(new RouteParser().parse(root.toString()).getFirst(),true,new HashMap<>());
        verify(lta).getBusArrivals("01234");
    }

    private RouteOption rail(String line,String from,String to) {
        var leg=new RouteLeg("MRT",line,new RouteLeg.Stop(from,null,from,null,null),
                new RouteLeg.Stop(to,null,to,null,null),1200.0,1000.0,null,null,List.of());
        return new RouteOption("rail","MRT",20,0,0,"unknown",0.0,1000.0,null,List.of(leg),List.of(),List.of(),List.of(),List.of());
    }
    private RouteEvidence train(RouteOption route,String json) {
        when(lta.getTrainServiceAlerts()).thenReturn(json);
        return service.attachConditions(route,true,new HashMap<>()).evidence().stream()
                .filter(item -> item.source().equals("LTA TrainServiceAlerts")).findFirst().orElseThrow();
    }
    private String alert(String line,String stations) {
        return "{\"value\":{\"Status\":2,\"AffectedSegments\":[{\"Line\":\""+line+"\",\"Stations\":\""+stations+"\"}]}}";
    }
    @Test void detectsIntermediateStationsAndDisplaysSegmentWarning() {
        when(lta.getTrainServiceAlerts()).thenReturn(alert("EWL","EW24,EW25"));
        var result=service.attachConditions(rail("EWL","EW23","EW26"),true,new HashMap<>());
        assertThat(result.warnings()).anyMatch(warning -> warning.contains("MRT disruption on EWL affecting EW24,EW25"));
        assertThat(result.evidence()).filteredOn(item -> item.source().equals("LTA TrainServiceAlerts"))
                .allMatch(item -> item.details().get("routeStatus").equals("disrupted"));
    }
    @Test void excludesNonOverlappingStationsOnSameLine() {
        assertThat(train(rail("EWL","EW1","EW3"),alert("EWL","EW24,EW25")).details())
                .containsEntry("routeStatus","no_matching_alert").containsEntry("matchingSegments",List.of());
    }
    @Test void excludesUnrelatedLineEvenAtInterchange() {
        assertThat(train(rail("EWL","EW24/NS1","EW25"),alert("NSL","NS1,NS2")).details())
                .containsEntry("routeStatus","no_matching_alert");
    }
    @Test void missingAffectedStationsIsUnknownWithReason() {
        var evidence=train(rail("EWL","EW24","EW25"),alert("EWL",""));
        assertThat(evidence.details()).containsEntry("routeStatus","unknown");
        assertThat(evidence.details().get("notices").toString()).contains("affected stations not supplied");
    }
    @Test void missingLineOnOneLegDoesNotHideKnownDisruption() {
        var known=rail("EWL","EW24","EW25");
        var missing=rail(null,"Unknown A","Unknown B");
        var combined=new RouteOption("rail","MRT",40,0,1,"unknown",0.0,2000.0,null,
                List.of(known.legs().getFirst(),missing.legs().getFirst()),List.of(),List.of(),List.of(),List.of());
        assertThat(train(combined,alert("EWL","EW24,EW25")).details())
                .containsEntry("routeStatus","disrupted").containsEntry("matchingIncomplete",true);
    }
    @Test void malformedAlertLineIsUnknownRatherThanUnaffected() {
        assertThat(train(rail("EWL","EW24","EW25"),alert("Unknown","EW24")).details())
                .containsEntry("routeStatus","unknown");
    }
    @Test void providerFailureHasUnknownReasonAndNoSecretDiagnostics() {
        when(lta.getTrainServiceAlerts()).thenThrow(new IllegalStateException("secret diagnostics"));
        var result=service.attachConditions(rail("EWL","EW24","EW25"),true,new HashMap<>());
        assertThat(result.warnings().toString()).contains("MRT service status unknown","provider")
                .doesNotContain("secret diagnostics");
    }
    @Test void checksLaterDisruptionStationsAfterUnrelatedCode() {
        assertThat(train(rail("CCL","CC4","CC6"),alert("CCL","EW4,CC5")).details())
                .containsEntry("routeStatus","disrupted");
    }
    @Test void checksLaterStationsAfterUnknownBranch() {
        assertThat(train(rail("EWL","EW3","EW5"),alert("EWL","CG1,EW4")).details())
                .containsEntry("routeStatus","disrupted");
    }
    @Test void checksLaterIntermediateStationOnRoute() throws Exception {
        var mapper=new ObjectMapper();
        var root=mapper.readTree(TestRoutes.fixture("onemap-mrt"));
        var leg=(ObjectNode)root.at("/plan/itineraries/0/legs/1");
        leg.put("routeShortName","EWL");
        var route=new RouteParser().parse(root.toString()).getFirst();
        assertThat(route.legs().get(1).intermediateStops()).extracting(RouteLeg.Stop::code)
                .contains("EW23","EW21");
        assertThat(train(route,alert("EWL","EW21")).details()).containsEntry("routeStatus","disrupted");
    }
    @Test void checksIntermediateStopsAcrossBranchesRatherThanEndpointRange() {
        var from=new RouteLeg.Stop("EW4",null,"EW4",null,null);
        var to=new RouteLeg.Stop("CG2",null,"CG2",null,null);
        var first=new RouteLeg.Stop("EW3",null,"EW3",null,null);
        var later=new RouteLeg.Stop("CG1",null,"CG1",null,null);
        var leg=new RouteLeg("MRT","EWL",from,to,1200.0,1000.0,null,null,List.of(),List.of(first,later));
        var route=new RouteOption("rail","MRT",20,0,0,"unknown",0.0,1000.0,null,
                List.of(leg),List.of(),List.of(),List.of(),List.of());
        assertThat(train(route,alert("EWL","CG1")).details()).containsEntry("routeStatus","disrupted");
    }
}
