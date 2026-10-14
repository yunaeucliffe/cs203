package com.silverroute.dto;

public record ProfileResponse(
        Long id,
        String name,
        String username,
        String email,
        String walkingSpeed,
        int minimizeWalkingPriority,
        int shelterPriority,
        boolean automaticLearning) {}
