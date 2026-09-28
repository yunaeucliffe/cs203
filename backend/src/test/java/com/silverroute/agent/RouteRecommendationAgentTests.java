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
    private RankingResult result(String... ids) {
        return new RankingResult(Arrays.stream(ids).map(id -> new RankingResult.Selection(id,List.of("Short walking distance"),List.of())).toList());
    }
    @Test void rebuildsOriginalRouteAndPreservesWarnings() throws Exception {
        var trip=TestRoutes.trip();
        var response=RouteRecommendationAgent.validateAndBuild(trip,result("onemap-route-1"),"test");
        assertThat(response.recommendedRoute().durationMinutes()).isEqualTo(trip.routes().getFirst().durationMinutes());
        assertThat(response.recommendedRoute().routePaths()).isEqualTo(trip.routes().getFirst().routePaths());
        assertThat(response.alternatives()).isEmpty();
        assertThat(response.warnings()).contains("Some evidence is unavailable","Accessibility has not been verified.");
    }
    @Test void refusesInventedIdsAndWrongCount() throws Exception {
        var trip=TestRoutes.trip();
        assertThatThrownBy(() -> RouteRecommendationAgent.validateAndBuild(trip,result("invented"),"test")).isInstanceOf(ModelAgentException.class);
        assertThatThrownBy(() -> RouteRecommendationAgent.validateAndBuild(trip,result(),"test")).isInstanceOf(ModelAgentException.class);
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
    }
    @Test void readsPreferencesOnlyForAuthenticatedIdentityBeforeOneRankingCall() throws Exception {
        var model=mock(ModelGateway.class); var aggregator=mock(RouteDataAggregatorService.class); var profiles=mock(ProfileService.class);
        var request=new TripRequest("A","B",OffsetDateTime.now()); var preferences=new SavedPreferences("Slow","Poor",true);
        when(profiles.getProfileByEmail("signed-in@example.com")).thenReturn(Optional.of(
                new ProfileResponse(1L,"Secret Name","secret-user","signed-in@example.com","Slow","Poor",true)));
        when(aggregator.aggregate(request,preferences)).thenReturn(TestRoutes.trip());
        when(model.rank(any())).thenReturn(result("onemap-route-1"));
        new RouteRecommendationAgent(model,aggregator,profiles).recommend(request,"signed-in@example.com");
        verify(profiles).getProfileByEmail("signed-in@example.com"); verifyNoMoreInteractions(profiles);
        verify(aggregator).aggregate(request,preferences); verify(model,times(1)).rank(TestRoutes.trip().context());
    }
    @Test void missingProfileDoesNotCallProvidersOrModel() {
        var model=mock(ModelGateway.class); var aggregator=mock(RouteDataAggregatorService.class); var profiles=mock(ProfileService.class);
        when(profiles.getProfileByEmail("missing")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> new RouteRecommendationAgent(model,aggregator,profiles)
                .recommend(new TripRequest("A","B",OffsetDateTime.now()),"missing")).isInstanceOf(RouteDataUnavailableException.class);
        verifyNoInteractions(model,aggregator);
    }
}
