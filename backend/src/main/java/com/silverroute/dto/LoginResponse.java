package com.silverroute.dto;

public record LoginResponse(
        boolean success,
        Long userId,
        String name,
        String message) {
}
