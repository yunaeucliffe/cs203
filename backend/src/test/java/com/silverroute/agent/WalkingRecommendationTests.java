package com.silverroute.agent;

import java.time.OffsetDateTime;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.silverroute.api.*;
import com.silverroute.dto.ProfileResponse;
import com.silverroute.routing.*;
import com.silverroute.service.*;

class WalkingRecommendationTests {
    AggregatedTrip trip(boolean transit) throws Exception {
        var base = TestRoutes.trip();
        var walking = new WalkingRouteParser().parse(TestRoutes.fixture("walking"),
                new LocationResult("A",1.3,103.8),new LocationResult("B",1.301,103.801),OffsetDateTime.now());
        walking = walking.attachConditions(100.0,List.of(),List.of());
        var routes = new ArrayList<RouteOption>();
        if (transit) {
            routes.add(TestRoutes.route());
            var r = TestRoutes.route();
            routes.add(new RouteOption("second",r.summary(),r.durationMinutes(),r.walkingMinutes(),r.transfers(),
                    r.walkingDistanceMeters(),r.distanceMeters(),r.estimatedShelteredWalkingMeters(),r.legs(),r.routePaths(),r.evidence(),r.reasons(),r.warnings()));
        }
        routes.add(walking);
        return new AggregatedTrip(new RouteContext(base.context().trip(),new SavedPreferences("Normal",50,20,true,500),
                routes.stream().map(RouteContext.Candidate::from).toList(),List.of(),2),routes,List.of("OneMap"));
    }
    @Test void appendsWalkingWithFinalRouteReferences() throws Exception {
        var trip=trip(true);
        var result=new RankingResult(List.of(new RankingResult.Selection(trip.routes().getFirst().id(),List.of("Compare {{route:second}}.")),
                new RankingResult.Selection("second",List.of())));
        var answer=RouteRecommendationAgent.validateAndBuild(trip,result,"test");
        assertThat(answer.alternatives()).hasSize(2);
        var walking=answer.alternatives().getLast();
        assertThat(walking.isWalkingOnly()).isTrue();
        assertThat(walking.reasons().toString()).contains("Within your 500 m walking limit", "Route 1");
        assertThat(answer.warnings()).contains("Compare Route 2.");
        assertThat(answer.recommendedRoute().isWalkingOnly()).isFalse();
    }
    @Test void emptyTransitRankingFallsBackToWalking() throws Exception {
        var answer=RouteRecommendationAgent.validateAndBuild(trip(true),new RankingResult(List.of()),"test");
        assertThat(answer.recommendedRoute().isWalkingOnly()).isTrue();
        assertThat(answer.alternatives()).isEmpty();
        assertThat(answer.warnings().toString()).contains("No usable public transport");
    }
    @Test void disabledWalkingFallbackDoesNotClaimToMeetSavedLimit() throws Exception {
        var base = trip(false);
        var context = new RouteContext(base.context().trip(), new SavedPreferences("Normal",50,20,false,100),
                base.context().candidates(), base.context().dataWarnings(), 2);
        var fallback = new AggregatedTrip(context, base.routes(), base.sources());
        var answer = RouteRecommendationAgent.validateAndBuild(fallback, new RankingResult(List.of()), "test");
        assertThat(answer.recommendedRoute().isWalkingOnly()).isTrue();
        assertThat(answer.reasons().toString()).contains("Walk all the way", "No public transport route")
                .doesNotContain("Within your", "walking limit");
    }
    @Test void walkingWeatherNoteUsesCandidateSummaryAndPreservesWarnings() throws Exception {
        for (boolean transit : List.of(false, true)) {
            var base = trip(transit);
            var routes = new ArrayList<>(base.routes());
            var walking = routes.getLast().attachConditions(100.0, List.of(), List.of("Walking source warning"));
            routes.set(routes.size() - 1, walking);
            var candidates = new ArrayList<>(routes.stream().map(RouteContext.Candidate::from).toList());
            var candidate = candidates.getLast();
            // Use a context summary independent of route evidence to catch accidental recomputation.
            var weather = new WeatherSummary(35.0, 2.0, true, true, 32, 300.0);
            candidates.set(candidates.size() - 1, new RouteContext.Candidate(candidate.id(), candidate.summary(),
                    candidate.durationMinutes(), candidate.walkingMinutes(), candidate.walkingDistanceMeters(),
                    candidate.transfers(), candidate.estimatedShelteredWalkingMeters(), candidate.legs(), candidate.evidence(), weather));
            var trip = new AggregatedTrip(new RouteContext(base.context().trip(), base.context().preferences(),
                    candidates, List.of(), 2), routes, base.sources());
            var selections = transit ? List.of(new RankingResult.Selection(routes.getFirst().id(), List.of()))
                    : List.<RankingResult.Selection>of();
            var answer = RouteRecommendationAgent.validateAndBuild(trip, new RankingResult(selections), "test");
            var result = transit ? answer.alternatives().getLast() : answer.recommendedRoute();
            assertThat(result.weatherNote()).contains("35°C", "2 mm", "300 m");
            assertThat(result.reasons().toString()).contains("35°C", "Within your 500 m walking limit");
            assertThat(result.warnings()).contains("Walking source warning");
            assertThat(answer.warnings()).contains("Walking source warning");
        }
    }
    @Test void walkingWithoutWeatherDoesNotInventANote() throws Exception {
        for (boolean transit : List.of(false, true)) {
            var trip = trip(transit);
            var selections = transit ? List.of(new RankingResult.Selection(trip.routes().getFirst().id(), List.of()))
                    : List.<RankingResult.Selection>of();
            var answer = RouteRecommendationAgent.validateAndBuild(trip, new RankingResult(selections), "test");
            var walking = transit ? answer.alternatives().getLast() : answer.recommendedRoute();
            assertThat(walking.weatherNote()).isNull();
            assertThat(walking.reasons().toString()).doesNotContain("Nearby temperature", "Nearby rainfall");
        }
    }
    @Test void modelReceivesOnlyTransitWithTwoSlotLimitAndIsSkippedForWalkingOnly() throws Exception {
        var gateway=mock(ModelGateway.class);
        var aggregator=mock(RouteDataAggregatorService.class);
        var profiles=mock(ProfileService.class);
        when(profiles.getProfileByEmail("user")).thenReturn(Optional.of(new ProfileResponse(1L,"Name","user","user",
                "Normal",50,20,true,true,500)));
        when(gateway.engine()).thenReturn("test");
        var trip=trip(true);
        when(aggregator.aggregate(any(),any())).thenReturn(trip);
        when(gateway.rank(any())).thenReturn(new RankingResult(List.of(new RankingResult.Selection(trip.routes().getFirst().id(),List.of()))));
        var agent=new RouteRecommendationAgent(gateway,aggregator,profiles);
        var request=new TripRequest("A","B",OffsetDateTime.now());
        agent.recommend(request,"user");
        var context=ArgumentCaptor.forClass(RouteContext.class);
        verify(gateway).rank(context.capture());
        assertThat(context.getValue().selectionLimit()).isEqualTo(2);
        assertThat(context.getValue().candidates()).extracting(RouteContext.Candidate::id).doesNotContain("onemap-walk");
        clearInvocations(gateway);
        when(aggregator.aggregate(any(),any())).thenReturn(trip(false));
        assertThat(agent.recommend(request,"user").recommendedRoute().isWalkingOnly()).isTrue();
        verify(gateway,never()).rank(any());
    }
}
