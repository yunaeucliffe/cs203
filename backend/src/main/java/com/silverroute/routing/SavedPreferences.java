package com.silverroute.routing;

public record SavedPreferences(String walkingSpeed, int minimizeWalkingPriority, int shelterPriority,
        boolean walkingOnlyEnabled, int walkingOnlyMaxDistanceMeters) {
    public SavedPreferences(String speed, int walking, int shelter) {
        this(speed, walking, shelter, false, 500);
    }
}
