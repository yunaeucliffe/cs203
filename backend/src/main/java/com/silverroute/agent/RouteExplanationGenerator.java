package com.silverroute.agent;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import com.silverroute.api.RouteOption;
import com.silverroute.routing.SavedPreferences;

/** Factual comparisons, independent of the model's reasons for ranking. */
public final class RouteExplanationGenerator {
    private RouteExplanationGenerator() {}

    public static List<String> explain(List<RouteOption> ranked, int index, SavedPreferences preferences) {
        RouteOption route = ranked.get(index);
        int otherIndex = index == 0 ? 1 : 0;
        RouteOption other = ranked.size() > 1 ? ranked.get(otherIndex) : null;
        String label = "Route " + (otherIndex + 1);
        String walking = "Walking priority: " + preferences.minimizeWalkingPriority() + "/100. "
                + metric("Walking distance", whole(route.walkingDistanceMeters()),
                        other == null ? null : whole(other.walkingDistanceMeters()), "m", other != null, label);
        String shelter = "Shelter priority: " + preferences.shelterPriority() + "/100. ";
        if (zeroWalking(route) || other != null && zeroWalking(other)) {
            shelter += other == null
                    ? "Estimated sheltered walking percentage is not applicable because this route has no walking."
                    : "Estimated sheltered walking percentage cannot be compared because "
                            + (zeroWalking(route) ? "this route" : label) + " has no walking.";
        } else {
            shelter += metric("Estimated sheltered walking", shelterPercent(route),
                    other == null ? null : shelterPercent(other), "%", other != null, label);
        }
        List<String> reasons = new ArrayList<>();
        if (preferences.shelterPriority() > preferences.minimizeWalkingPriority()) {
            reasons.add(shelter);
            reasons.add(walking);
        } else {
            reasons.add(walking);
            reasons.add(shelter);
        }
        reasons.add(metric("Journey duration", whole(route.durationMinutes()),
                other == null ? null : whole(other.durationMinutes()), "min", other != null, label));
        reasons.add(metric("Transfers", whole(route.transfers()),
                other == null ? null : whole(other.transfers()), "", other != null, label));
        return List.copyOf(reasons);
    }

    private static String metric(String name, BigDecimal value, BigDecimal other, String unit,
            boolean compare, String label) {
        if (!compare) return value == null ? name + (name.equals("Transfers") ? " are unavailable." : " is unavailable.")
                : name + ": " + display(value, unit) + ".";
        if (value == null || other == null)
            return name + " cannot be compared with " + label + " because data is unavailable.";
        int difference = value.compareTo(other);
        if (difference == 0)
            return name + ": " + display(value, unit) + ", the same as " + label + ".";
        return name + ": " + display(value, unit) + ", " + (difference < 0 ? "lower" : "higher")
                + " than " + label + " (" + display(other, unit) + ").";
    }

    private static String display(BigDecimal value, String unit) {
        return value.toPlainString() + (unit.isEmpty() || unit.equals("%") ? "" : " ") + unit;
    }

    private static BigDecimal whole(Number value) {
        return valid(value) ? new BigDecimal(value.toString()).setScale(0, RoundingMode.HALF_UP) : null;
    }

    private static boolean valid(Number value) {
        return value != null && Double.isFinite(value.doubleValue()) && value.doubleValue() >= 0;
    }

    private static boolean zeroWalking(RouteOption route) {
        return valid(route.walkingDistanceMeters()) && route.walkingDistanceMeters() == 0;
    }

    private static BigDecimal shelterPercent(RouteOption route) {
        Double walking = route.walkingDistanceMeters(), shelter = route.estimatedShelteredWalkingMeters();
        if (!valid(walking) || walking <= 0 || !valid(shelter)) return null;
        return BigDecimal.valueOf(shelter).multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(walking), 0, RoundingMode.HALF_UP).min(BigDecimal.valueOf(100));
    }
}
