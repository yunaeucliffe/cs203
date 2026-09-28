package com.silverroute.agent;

import java.util.*;
import org.springframework.stereotype.Service;
import com.silverroute.api.*;
import com.silverroute.exception.*;
import com.silverroute.routing.*;
import com.silverroute.service.ProfileService;
import com.silverroute.service.RouteDataAggregatorService;

@Service
public class RouteRecommendationAgent {
    private final ModelGateway model;
    private final RouteDataAggregatorService aggregator;
    private final ProfileService profiles;

    public RouteRecommendationAgent(ModelGateway model, RouteDataAggregatorService aggregator, ProfileService profiles) {
        this.model = model;
        this.aggregator = aggregator;
        this.profiles = profiles;
    }

    public AgentRecommendation recommend(TripRequest request, String authenticatedEmail) {
        var profile = profiles.getProfileByEmail(authenticatedEmail).orElseThrow(() ->
                new RouteDataUnavailableException("Saved travel preferences are unavailable"));
        var trip = aggregator.aggregate(request, new SavedPreferences(profile.walkingSpeed(),
                profile.walkingTolerance(), profile.preferSheltered()));
        if (trip.routes().isEmpty()) throw new RouteDataUnavailableException("No routes were available for this trip");
        try {
            return validateAndBuild(trip, model.rank(trip.context()), model.engine());
        } catch (ModelAgentException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw new ModelAgentException("The model could not produce a valid recommendation", exception);
        }
    }

    public static AgentRecommendation validateAndBuild(AggregatedTrip trip, RankingResult result, String engine) {
        int expected = Math.min(3, trip.routes().size());
        if (result == null || result.rankings() == null || result.rankings().size() != expected || expected == 0)
            throw new ModelAgentException("The model returned an invalid number of routes");
        Map<String, RouteOption> candidates = new HashMap<>();
        trip.routes().forEach(route -> candidates.put(route.id(), route));
        Set<String> seen = new HashSet<>();
        List<RouteOption> ranked = new ArrayList<>();
        for (var selection : result.rankings()) {
            if (selection == null || !candidates.containsKey(selection.routeId()) || !seen.add(selection.routeId())
                    || !validText(selection.reasons(), true) || !validText(selection.warnings(), false))
                throw new ModelAgentException("The model returned invalid route selections or explanations");
            ranked.add(candidates.get(selection.routeId()).explain(selection.reasons(), selection.warnings()));
        }
        Set<String> warnings = new LinkedHashSet<>(trip.context().dataWarnings());
        ranked.forEach(route -> warnings.addAll(route.warnings()));
        return new AgentRecommendation(ranked.getFirst(), List.copyOf(ranked.subList(1, ranked.size())),
                ranked.getFirst().reasons(), List.copyOf(warnings), trip.sources(), engine);
    }

    private static boolean validText(List<String> text, boolean required) {
        return text != null && (!required || !text.isEmpty()) && text.size() <= 8
                && text.stream().allMatch(value -> value != null && !value.isBlank() && value.length() <= 1000);
    }
}
