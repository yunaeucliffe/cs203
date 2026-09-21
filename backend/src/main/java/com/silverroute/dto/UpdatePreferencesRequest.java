package com.silverroute.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record UpdatePreferencesRequest(
        @NotBlank
        @Pattern(regexp = "Slow|Normal|Fast", message = "must be Slow, Normal, or Fast")
        String walkingSpeed,
        @NotNull @Min(50) @Max(10000)
        Integer maxWalkingDistance,
        @NotNull
        Boolean avoidStairs) {
}
