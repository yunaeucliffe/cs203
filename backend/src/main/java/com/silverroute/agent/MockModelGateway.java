package com.silverroute.agent;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Component;

import com.silverroute.api.RouteOption;
import com.silverroute.api.TripPreferences;
import com.silverroute.exception.RouteDataUnavailableException;
import com.silverroute.tool.ToolDefinition;

@Component
public class MockModelGateway implements ModelGateway {

    public static final String ENGINE = "mock-agent-v1";

    @Override
    public AgentAction nextAction(AgentState state, List<ToolDefinition> availableTools) {
        List<ToolObservation> successful = state.observations().stream()
                .filter(ToolObservation::successful)
                .filter(observation -> !observation.routes().isEmpty())
                .toList();

        if (!successful.isEmpty()) {
            return new FinalAnswerAction(createRecommendation(state, successful));
        }

        Set<String> attemptedTools = state.observations().stream()
                .map(ToolObservation::toolName)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));

        return availableTools.stream()
                .filter(tool -> !attemptedTools.contains(tool.name()))
                .findFirst()
                .<AgentAction>map(tool -> new ToolCallAction(tool.name()))
                .orElseThrow(() -> new RouteDataUnavailableException(
                        "No route-data tool returned usable route information"));
    }

    private AgentRecommendation createRecommendation(
            AgentState state,
            List<ToolObservation> successfulObservations) {
        List<RouteOption> routes = successfulObservations.stream()
                .flatMap(observation -> observation.routes().stream())
                .distinct()
                .sorted(routeComparator(state.request().preferences()))
                .toList();

        if (routes.isEmpty()) {
            throw new RouteDataUnavailableException("No routes were available for this trip");
        }

        RouteOption recommended = routes.getFirst();
        List<String> warnings = state.observations().stream()
                .flatMap(observation -> observation.warnings().stream())
                .toList();
        List<String> sources = successfulObservations.stream()
                .map(ToolObservation::source)
                .distinct()
                .toList();

        return new AgentRecommendation(
                recommended,
                routes.stream().skip(1).toList(),
                reasons(recommended, state.request().preferences()),
                warnings,
                sources,
                ENGINE);
    }

    private Comparator<RouteOption> routeComparator(TripPreferences preferences) {
        return Comparator
                .comparingDouble((RouteOption route) -> score(route, preferences))
                .reversed()
                .thenComparingInt(RouteOption::durationMinutes)
                .thenComparing(RouteOption::id);
    }

    private double score(RouteOption route, TripPreferences preferences) {
        double score = 100;
        score -= route.durationMinutes() * 0.5;
        score -= route.walkingMinutes() * 3.0;
        score -= route.transfers() * (preferences.minimizeTransfers() ? 12.0 : 5.0);

        if (preferences.wheelchairAccessible() && !route.wheelchairAccessible()) {
            score -= 100;
        }
        if (route.walkingMinutes() > preferences.maxWalkingMinutes()) {
            score -= (route.walkingMinutes() - preferences.maxWalkingMinutes()) * 4.0;
        }
        return score;
    }

    private List<String> reasons(RouteOption route, TripPreferences preferences) {
        List<String> reasons = new ArrayList<>();
        if (route.transfers() == 0) {
            reasons.add("No transfers required");
        } else {
            reasons.add(route.transfers() + (route.transfers() == 1 ? " transfer" : " transfers"));
        }

        if (route.walkingMinutes() <= preferences.maxWalkingMinutes()) {
            reasons.add("Walking time is within the requested limit");
        } else {
            reasons.add("This option exceeds the preferred walking time");
        }

        if (route.wheelchairAccessible()) {
            reasons.add("Wheelchair-accessible option");
        }
        return List.copyOf(reasons);
    }
}
