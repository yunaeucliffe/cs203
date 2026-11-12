package com.silverroute.controller;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.silverroute.service.TripShareService;

// Endpoints an external scheduler calls instead of relying solely on an
// in-process @Scheduled task, which would not run while the container is
// scaled to zero. Not session-authenticated (there is no signed-in user);
// instead it requires a shared secret, so it is intentionally outside the
// SecurityConfig-authenticated paths and checked here.
@RestController
@RequestMapping("/api/internal")
public class ScheduledTaskController {

    private final TripShareService tripShareService;
    private final String cronSecret;

    public ScheduledTaskController(
            TripShareService tripShareService,
            @Value("${cron.secret:}") String cronSecret) {
        this.tripShareService = tripShareService;
        this.cronSecret = cronSecret;
    }

    @GetMapping("/trip-shares/cleanup")
    public ResponseEntity<Void> cleanupExpiredTripShares(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        requireValidSecret(authorization);
        tripShareService.deleteExpired();
        return ResponseEntity.noContent().build();
    }

    private void requireValidSecret(String authorization) {
        if (cronSecret.isBlank() || authorization == null
                || !constantTimeEquals(authorization, "Bearer " + cronSecret)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        return MessageDigest.isEqual(
                a.getBytes(StandardCharsets.UTF_8),
                b.getBytes(StandardCharsets.UTF_8));
    }
}
