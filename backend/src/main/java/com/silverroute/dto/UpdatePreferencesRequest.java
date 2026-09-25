package com.silverroute.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdatePreferencesRequest(
        @NotBlank
        @Pattern(regexp = "Slow|Normal|Fast", message = "must be Slow, Normal, or Fast")
        String walkingSpeed,
        @NotBlank @Size(max = 20)
        String walkingTolerance,
        @NotNull
        Boolean preferSheltered) {
}
