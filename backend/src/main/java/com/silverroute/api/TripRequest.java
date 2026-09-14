package com.silverroute.api;

import java.time.OffsetDateTime;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record TripRequest(
        @NotBlank String origin,
        @NotBlank String destination,
        @NotNull OffsetDateTime departureTime,
        @NotNull @Valid TripPreferences preferences) {
}
