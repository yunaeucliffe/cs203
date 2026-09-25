package com.silverroute.dto;

public record ProfileResponse(
        Long id,
        String name,
        String username,
        String email,
        String walkingSpeed,
        String walkingTolerance,
        boolean preferSheltered) {
}
