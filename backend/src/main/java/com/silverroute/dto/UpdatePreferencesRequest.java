package com.silverroute.dto;

import jakarta.validation.constraints.*;

public record UpdatePreferencesRequest(
        @NotBlank @Pattern(regexp = "Slow|Normal|Fast", message = "must be Slow, Normal, or Fast")
        String walkingSpeed,
        @NotNull @Min(0) @Max(100) Integer minimizeWalkingPriority,
        @NotNull @Min(0) @Max(100) Integer shelterPriority,
        @NotNull Boolean automaticLearning) {}
