package com.silverroute.agent;

import java.util.List;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import com.silverroute.api.RouteOption;
import com.silverroute.routing.SavedPreferences;

class RouteExplanationGeneratorTests {
    private RouteOption route(Double walking, Double shelter, Integer duration, Integer transfers) {
        return new RouteOption("id", "Trip", duration, null, transfers, "unknown", walking, null, shelter,
                List.of(), List.of(), List.of(), List.of(), List.of());
    }
    private final SavedPreferences preferences = new SavedPreferences("Slow", 80, 20);

    @Test void exactComparisonsAreRepeatableAndIncludeDisadvantages() {
        var routes = List.of(route(248.71, 124.355, 6, 0), route(290.88, 290.88, 5, 0));
        var reasons = RouteExplanationGenerator.explain(routes, 0, preferences);
        assertThat(reasons).containsExactly(
                "Walking priority: 80/100. Walking distance: 249 m, lower than Route 2 (291 m).",
                "Shelter priority: 20/100. Estimated sheltered walking: 50%, lower than Route 2 (100%).",
                "Journey duration: 6 min, higher than Route 2 (5 min).",
                "Transfers: 0, the same as Route 2.");
        assertThat(RouteExplanationGenerator.explain(routes, 0, preferences)).isEqualTo(reasons);
        assertThat(RouteExplanationGenerator.explain(routes, 0, new SavedPreferences("Normal", 20, 80)))
                .startsWith("Shelter priority: 80/100. Estimated sheltered walking: 50%, lower than Route 2 (100%).",
                        "Walking priority: 20/100. Walking distance: 249 m, lower than Route 2 (291 m).");
        assertThat(RouteExplanationGenerator.explain(routes, 0, new SavedPreferences("Normal", 50, 50)).getFirst())
                .startsWith("Walking priority: 50/100.");
    }

    @Test void roundsHalfUpBeforeComparingAndCapsShelter() {
        var reasons = RouteExplanationGenerator.explain(
                List.of(route(100.5, 200.0, 1, 2), route(101.49, 200.0, 2, 1)), 0, preferences);
        assertThat(reasons.get(0)).endsWith("101 m, the same as Route 2.");
        assertThat(reasons.get(1)).endsWith("100%, the same as Route 2.");
        assertThat(reasons.get(2)).isEqualTo("Journey duration: 1 min, lower than Route 2 (2 min).");
        assertThat(reasons.get(3)).isEqualTo("Transfers: 2, higher than Route 2 (1).");
        assertThat(RouteExplanationGenerator.explain(List.of(route(200.0, 101.0, 1, 0)), 0, preferences).get(1))
                .endsWith("51%.");
    }

    @Test void missingAndInvalidValuesNeverBecomeZero() {
        for (Double value : new Double[]{null, Double.NaN, Double.POSITIVE_INFINITY, -1.0}) {
            var invalid = route(value, value, null, null);
            assertThat(RouteExplanationGenerator.explain(List.of(invalid), 0, preferences)).containsExactly(
                    "Walking priority: 80/100. Walking distance is unavailable.",
                    "Shelter priority: 20/100. Estimated sheltered walking is unavailable.",
                    "Journey duration is unavailable.", "Transfers are unavailable.");
            var valid = route(100.0, 50.0, 1, 0);
            for (var routes : List.of(List.of(invalid, valid), List.of(valid, invalid))) {
                assertThat(RouteExplanationGenerator.explain(routes, 0, preferences))
                        .allMatch(text -> text.contains("cannot be compared with Route 2 because data is unavailable."));
            }
        }
    }

    @Test void singleRouteAndZeroWalkingHaveNoInventedComparison() {
        var zero = route(0.0, 0.0, 4, 0);
        assertThat(RouteExplanationGenerator.explain(List.of(zero), 0, preferences)).containsExactly(
                "Walking priority: 80/100. Walking distance: 0 m.",
                "Shelter priority: 20/100. Estimated sheltered walking percentage is not applicable because this route has no walking.",
                "Journey duration: 4 min.", "Transfers: 0.");
        var other = route(100.0, 50.0, 5, 1);
        assertThat(RouteExplanationGenerator.explain(List.of(other, zero), 0, preferences).get(1))
                .endsWith("cannot be compared because Route 2 has no walking.");
        assertThat(RouteExplanationGenerator.explain(List.of(zero, other), 0, preferences).get(1))
                .endsWith("cannot be compared because this route has no walking.");
    }
}
