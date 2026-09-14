package com.silverroute.api;

public record RouteOption(
        String id,
        String summary,
        int durationMinutes,
        int walkingMinutes,
        int transfers,
        boolean wheelchairAccessible) {
}
