package com.silverroute.dto;

import jakarta.validation.constraints.*;

public record UpdatePreferencesRequest(
        @NotBlank @Pattern(regexp = "Slow|Normal|Fast", message = "must be Slow, Normal, or Fast")
        String walkingSpeed,
        @NotNull @Min(0) @Max(100) Integer minimizeWalkingPriority,
        @NotNull @Min(0) @Max(100) Integer shelterPriority,
        @NotNull Boolean automaticLearning,
        Boolean walkingOnlyEnabled,
        @Min(100) @Max(5000) Integer walkingOnlyMaxDistanceMeters) {
    public UpdatePreferencesRequest(String speed, Integer walking, Integer shelter, Boolean learning) {
        this(speed, walking, shelter, learning, null, null);
    }
}
