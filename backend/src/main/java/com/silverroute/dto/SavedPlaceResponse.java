package com.silverroute.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record SavedPlaceResponse(
        Long id,
        String label,
        String address,
        BigDecimal latitude,
        BigDecimal longitude,
        LocalDateTime createdAt) {
}
