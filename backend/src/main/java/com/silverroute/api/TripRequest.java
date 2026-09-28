package com.silverroute.api;

import java.time.OffsetDateTime;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public record TripRequest(
        @NotBlank @Size(max = 500) String origin,
        @NotBlank @Size(max = 500) String destination,
        @NotNull OffsetDateTime departureTime,
        @Valid Coordinates originCoordinates,
        @Valid Coordinates destinationCoordinates) {
    public TripRequest(String origin, String destination, OffsetDateTime departureTime) {
        this(origin, destination, departureTime, null, null);
    }
    public record Coordinates(
            @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
            @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude) {}
}
