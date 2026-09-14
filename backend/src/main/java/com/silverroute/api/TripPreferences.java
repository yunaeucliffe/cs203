package com.silverroute.api;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record TripPreferences(
        @NotNull @PositiveOrZero Integer maxWalkingMinutes,
        boolean wheelchairAccessible,
        boolean minimizeTransfers) {
}
