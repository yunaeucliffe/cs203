package com.silverroute.routing;

import java.util.List;

public record RouteLeg(String mode, String service, Stop from, Stop to,
        Double durationSeconds, Double distanceMeters, String startTime, String endTime,
        List<List<Double>> path) {
    public record Stop(String id, String code, String name, Double latitude, Double longitude) {}
}
