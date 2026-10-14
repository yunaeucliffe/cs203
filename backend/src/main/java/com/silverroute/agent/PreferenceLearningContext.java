package com.silverroute.agent;

/** Metrics only: no user identity, location names, geometry or free-form provider strings. */
public record PreferenceLearningContext(int minimizeWalkingPriority, int shelterPriority,
        RouteMetrics recommended, RouteMetrics chosen) {
    public record RouteMetrics(Double walkingDistanceMeters, Double shelteredWalkingShare,
            Integer walkingMinutes, Integer durationMinutes, Integer transfers) {}
}
