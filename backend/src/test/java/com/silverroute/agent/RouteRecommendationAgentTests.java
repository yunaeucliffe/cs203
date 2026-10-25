package com.silverroute.agent;

import java.time.OffsetDateTime;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.silverroute.api.*;
import com.silverroute.dto.ProfileResponse;
import com.silverroute.exception.*;
import com.silverroute.routing.*;
import com.silverroute.service.*;

class RouteRecommendationAgentTests {
    private AggregatedTrip referenceTrip() throws Exception {
        var original = TestRoutes.route();
        List<RouteOption> routes = new ArrayList<>();
        for (int i = 1; i <= 3; i++) {
            var stop = new RouteLeg.Stop("stop-" + i, null, "Stop " + i, 1.3 + i / 100.0, 103.8);
            var path = List.of(List.of(stop.latitude(), stop.longitude()));
            var leg = new RouteLeg("WALK", null, stop, stop, 60.0 * i, 100.0 * i, null, null, path);
            routes.add(new RouteOption("onemap-route-" + i, "Candidate", 10 * i, i, 0, "unknown",
                    100.0 * i, 100.0 * i, null, List.of(leg), List.of(path), List.of(), List.of(), original.warnings()));
        }
        var context = TestRoutes.trip().context();
        return new AggregatedTrip(new RouteContext(context.trip(), context.preferences(),
                routes.stream().map(RouteContext.Candidate::from).toList(), context.dataWarnings()), routes, List.of("onemap"));
    }

    @Test void generatesComparisonsInFinalOrderAndPreservesRouteData() throws Exception {
        var trip = referenceTrip();
        var result = new RankingResult(List.of(
                new RankingResult.Selection("onemap-route-3", List.of("Compare {{route:onemap-route-1}}.")),
                new RankingResult.Selection("onemap-route-1", List.of()),
                new RankingResult.Selection("onemap-route-2", List.of())));
        var answer = RouteRecommendationAgent.validateAndBuild(trip, result, "test");
        assertThat(answer.reasons()).isEqualTo(answer.recommendedRoute().reasons());
        assertThat(answer.reasons().toString()).contains("higher than Route 2").doesNotContain("Route 3");
        assertThat(answer.warnings()).contains("Compare Route 2.");
        var displayed = new ArrayList<RouteOption>();
        displayed.add(answer.recommendedRoute());
        displayed.addAll(answer.alternatives());
        for (var route : displayed) {
            var source = trip.routes().stream().filter(r -> r.id().equals(route.id())).findFirst().orElseThrow();
            assertThat(route).usingRecursiveComparison().ignoringFields("reasons", "warnings").isEqualTo(source);
            assertThat(route.reasons().toString() + route.warnings()).doesNotContain("{{", "}}", "onemap-route-");
        }
        assertThat(displayed.get(1).reasons().toString()).contains("lower than Route 1");
        assertThat(displayed.get(2).reasons().toString()).contains("lower than Route 1");
        assertThat(RouteRecommendationAgent.validateAndBuild(trip, result, "test")).isEqualTo(answer);
    }

    @Test void generatesComparisonsWhenOnlyTwoRoutesRemain() throws Exception {
        var answer = RouteRecommendationAgent.validateAndBuild(referenceTrip(), result("onemap-route-3", "onemap-route-1"), "test");
        assertThat(answer.reasons().toString()).contains("Route 2").doesNotContain("Route 3");
        assertThat(answer.alternatives()).hasSize(1);
    }

    @Test void mockRankingUsesTheSameGeneratedExplanations() throws Exception {
        var trip = referenceTrip();
        var mock = new MockModelGateway();
        var answer = RouteRecommendationAgent.validateAndBuild(trip, mock.rank(trip.context()), mock.engine());
        assertThat(answer.reasons()).hasSize(4).isEqualTo(answer.recommendedRoute().reasons());
        assertThat(answer.reasons().toString()).contains("lower than Route 2");
        assertThat(answer.warnings()).contains("Mock data; not for navigation");
    }

    @Test void rejectsInvalidWarningReferences() throws Exception {
        var trip = referenceTrip();
        for (String invalid : List.of("{{route:missing}}", "{{route:onemap-route-2}}", "{{route:onemap-route-3}}",
                "{{route:}}", "{route:onemap-route-1}", "{{route:onemap-route-1}", "{{Route:onemap-route-1}}",
                "{{route: onemap-route-1}}", "{{{route:onemap-route-1}}}", "route 1", "Route #2", "route one",
                "the second route", "onemap-route-1", "onemap-route-99")) {
            var result = new RankingResult(List.of(new RankingResult.Selection("onemap-route-3", List.of(invalid)),
                    new RankingResult.Selection("onemap-route-1", List.of())));
            assertThatThrownBy(() -> RouteRecommendationAgent.validateAndBuild(trip, result, "test"))
                    .as("Invalid reference %s", invalid).isInstanceOf(ModelAgentException.class);
        }
    }

    private RankingResult result(String... ids) {
        return new RankingResult(Arrays.stream(ids).map(id -> new RankingResult.Selection(id,List.of())).toList());
    }
    @Test void rebuildsOriginalRouteAndPreservesWarnings() throws Exception {
        var trip=TestRoutes.trip();
        var response=RouteRecommendationAgent.validateAndBuild(trip,result("onemap-route-1"),"test");
        assertThat(response.recommendedRoute().durationMinutes()).isEqualTo(trip.routes().getFirst().durationMinutes());
        assertThat(response.recommendedRoute().routePaths()).isEqualTo(trip.routes().getFirst().routePaths());
        assertThat(response.alternatives()).isEmpty();
        assertThat(response.warnings()).contains("Some evidence is unavailable","Accessibility has not been verified.");
    }
    @Test void refusesInventedIdsAndReportsNoUsableRoutesForEmptyRanking() throws Exception {
        var trip=TestRoutes.trip();
        assertThatThrownBy(() -> RouteRecommendationAgent.validateAndBuild(trip,result("invented"),"test")).isInstanceOf(ModelAgentException.class);
        assertThatThrownBy(() -> RouteRecommendationAgent.validateAndBuild(trip,result(),"test"))
                .isInstanceOf(RouteDataUnavailableException.class).hasMessageContaining("No usable routes");
    }
    @Test void refusesDuplicateIdsAndReturnsOnlyTopThree() throws Exception {
        var one=TestRoutes.route();
        List<RouteOption> routes=new ArrayList<>(List.of(one));
        for(int i=2;i<=4;i++) routes.add(new RouteOption("route-"+i,one.summary(),one.durationMinutes(),one.walkingMinutes(),one.transfers(),
                one.accessibility(),one.walkingDistanceMeters(),one.distanceMeters(),null,one.legs(),one.routePaths(),List.of(),List.of(),List.of()));
        var trip=new AggregatedTrip(TestRoutes.trip().context(),routes,List.of("onemap"));
        assertThatThrownBy(() -> RouteRecommendationAgent.validateAndBuild(trip,result("route-2","route-2","route-3"),"test"))
                .isInstanceOf(ModelAgentException.class);
        assertThat(RouteRecommendationAgent.validateAndBuild(trip,result("route-4","route-3","route-2"),"test").alternatives()).hasSize(2);
        var filtered=RouteRecommendationAgent.validateAndBuild(trip,result("route-3"),"test");
        assertThat(filtered.recommendedRoute().id()).isEqualTo("route-3");
        assertThat(filtered.alternatives()).isEmpty();
        assertThatThrownBy(() -> RouteRecommendationAgent.validateAndBuild(trip,
                result(one.id(),"route-2","route-3","route-4"),"test")).isInstanceOf(ModelAgentException.class);
    }
    @Test void readsPreferencesOnlyForAuthenticatedIdentityBeforeOneRankingCall() throws Exception {
        var model=mock(ModelGateway.class); var aggregator=mock(RouteDataAggregatorService.class); var profiles=mock(ProfileService.class);
        var request=new TripRequest("A","B",OffsetDateTime.now()); var preferences=new SavedPreferences("Slow",65,90);
        when(profiles.getProfileByEmail("signed-in@example.com")).thenReturn(Optional.of(
                new ProfileResponse(1L,"Secret Name","secret-user","signed-in@example.com","Slow",65,90,true)));
        when(aggregator.aggregate(request,preferences)).thenReturn(TestRoutes.trip());
        when(model.rank(any())).thenReturn(result("onemap-route-1"));
        new RouteRecommendationAgent(model,aggregator,profiles).recommend(request,"signed-in@example.com");
        verify(profiles).getProfileByEmail("signed-in@example.com"); verifyNoMoreInteractions(profiles);
        verify(aggregator).aggregate(request,preferences); verify(model,times(1)).rank(TestRoutes.trip().context());
        when(model.rank(any())).thenReturn(result());
        assertThatThrownBy(() -> new RouteRecommendationAgent(model,aggregator,profiles).recommend(request,"signed-in@example.com"))
                .isInstanceOf(RouteDataUnavailableException.class).hasMessageContaining("No usable routes");
    }
    @Test void missingProfileDoesNotCallProvidersOrModel() {
        var model=mock(ModelGateway.class); var aggregator=mock(RouteDataAggregatorService.class); var profiles=mock(ProfileService.class);
        when(profiles.getProfileByEmail("missing")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> new RouteRecommendationAgent(model,aggregator,profiles)
                .recommend(new TripRequest("A","B",OffsetDateTime.now()),"missing")).isInstanceOf(RouteDataUnavailableException.class);
        verifyNoInteractions(model,aggregator);
    }
}
