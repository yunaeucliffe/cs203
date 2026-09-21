package com.silverroute.api;

import java.util.List;

public record RouteOption(
        String id,
        String summary,
        int durationMinutes,
        int walkingMinutes,
        int transfers,
        boolean wheelchairAccessible,
        Double distanceMeters,
        Double walkingDistanceMeters,
        List<List<List<Double>>> routePaths) {

    // Keep the existing agent and mock route contract compatible.
    public RouteOption(String id, String summary, int durationMinutes,
            int walkingMinutes, int transfers, boolean wheelchairAccessible) {
        this(id, summary, durationMinutes, walkingMinutes, transfers,
                wheelchairAccessible, null, null, List.of());
    }
}
