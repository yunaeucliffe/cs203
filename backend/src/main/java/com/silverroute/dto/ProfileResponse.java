package com.silverroute.dto;

public record ProfileResponse(
        Long id,
        String name,
        String email,
        String walkingSpeed,
        Integer maxWalkingDistance,
        boolean avoidStairs) {
}
