package com.silverroute.routing;

import java.util.List;

public record RouteLeg(String mode, String service, Stop from, Stop to,
        Double durationSeconds, Double distanceMeters, String startTime, String endTime,
        List<List<Double>> path, List<Stop> intermediateStops) {
    public RouteLeg {
        intermediateStops = intermediateStops == null ? List.of() : List.copyOf(intermediateStops);
    }
    public RouteLeg(String mode, String service, Stop from, Stop to, Double durationSeconds,
            Double distanceMeters, String startTime, String endTime, List<List<Double>> path) {
        this(mode, service, from, to, durationSeconds, distanceMeters, startTime, endTime, path, List.of());
    }
    public record Stop(String id, String code, String name, Double latitude, Double longitude) {}
}
