package com.silverroute.dto;

public record ProfileResponse(
        Long id,
        String name,
        String username,
        String email,
        String walkingSpeed,
        int minimizeWalkingPriority,
        int shelterPriority,
        boolean automaticLearning,
        boolean walkingOnlyEnabled,
        int walkingOnlyMaxDistanceMeters) {
    public ProfileResponse(Long id, String name, String username, String email, String speed,
            int walking, int shelter, boolean learning) {
        this(id, name, username, email, speed, walking, shelter, learning, false, 500);
    }
}
