package com.silverroute.api;

// Record to store location in clean format
public record LocationResult(
        String name,
        double latitude,
        double longitude) {
}