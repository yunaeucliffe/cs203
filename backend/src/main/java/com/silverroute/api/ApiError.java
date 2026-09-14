package com.silverroute.api;

import java.time.OffsetDateTime;

public record ApiError(
        int status,
        String message,
        String requestId,
        OffsetDateTime timestamp) {
}
