package com.silverroute.api;

import java.util.List;
import com.silverroute.routing.RouteLeg;
import com.silverroute.routing.RouteEvidence;

public record RouteOption(String id, String summary, Integer durationMinutes, Integer walkingMinutes,
        Integer transfers, String accessibility, Double walkingDistanceMeters, Double distanceMeters,
        Double estimatedShelteredWalkingMeters, List<RouteLeg> legs, List<List<List<Double>>> routePaths,
        List<RouteEvidence> evidence, List<String> reasons, List<String> warnings) {
    public RouteOption {
        legs = List.copyOf(legs);
        routePaths = List.copyOf(routePaths);
        evidence = List.copyOf(evidence);
        reasons = List.copyOf(reasons);
        warnings = List.copyOf(warnings);
    }
    public RouteOption enrich(Double shelter, List<RouteEvidence> evidence, List<String> warnings) {
        return new RouteOption(id, summary, durationMinutes, walkingMinutes, transfers, accessibility,
                walkingDistanceMeters, distanceMeters, shelter, legs, routePaths, evidence, reasons, warnings);
    }
    public RouteOption explain(List<String> reasons, List<String> modelWarnings) {
        var combined = new java.util.LinkedHashSet<>(warnings);
        combined.addAll(modelWarnings);
        return new RouteOption(id, summary, durationMinutes, walkingMinutes, transfers, accessibility,
                walkingDistanceMeters, distanceMeters, estimatedShelteredWalkingMeters, legs, routePaths,
                evidence, reasons, List.copyOf(combined));
    }
}
