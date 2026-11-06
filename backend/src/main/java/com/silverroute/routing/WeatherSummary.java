package com.silverroute.routing;

import java.util.List;
import java.util.Map;

/** Derived only from route-matched, validated observations. Null triggers mean unknown. */
public record WeatherSummary(Double maxTemperatureCelsius, Double maxRainfallMm,
        Boolean hot, Boolean raining, double heatThresholdCelsius, Double estimatedUnshelteredWalkingMeters) {
    public static final double DEFAULT_HEAT_THRESHOLD = 30;

    public static WeatherSummary from(List<RouteEvidence> evidence, Double walking, Double sheltered, double threshold) {
        if (!Double.isFinite(threshold)) throw new IllegalArgumentException("Heat threshold must be finite");
        Double temperature = maximum(evidence, "NEA Air Temperature", "temperatureCelsius", false);
        Double rain = maximum(evidence, "NEA Rainfall", "rainfallMm", true);
        Double exposed = validDistance(walking) && validDistance(sheltered)
                ? Math.max(0, Math.min(walking, walking - sheltered)) : null;
        return new WeatherSummary(temperature, rain, temperature == null ? null : temperature >= threshold,
                rain == null ? null : rain > 0, threshold, exposed);
    }

    private static boolean validDistance(Double value) {
        return value != null && Double.isFinite(value) && value >= 0;
    }

    private static Double maximum(List<RouteEvidence> evidence, String source, String key, boolean nonnegative) {
        Double result = null;
        for (var item : evidence) {
            if (!source.equals(item.source()) || !"available".equals(item.availability())) continue;
            if (!(item.details().get("observations") instanceof List<?> observations)) continue;
            for (var observation : observations) {
                if (!(observation instanceof Map<?, ?> fields) || !(fields.get(key) instanceof Number number)) continue;
                double value = number.doubleValue();
                if (!Double.isFinite(value) || nonnegative && value < 0) continue;
                result = result == null ? value : Math.max(result, value);
            }
        }
        return result;
    }
}
