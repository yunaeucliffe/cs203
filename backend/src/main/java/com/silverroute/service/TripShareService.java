package com.silverroute.service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.TimeUnit;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import jakarta.validation.constraints.*;
import com.silverroute.model.TripShare;
import com.silverroute.repository.*;

@Service
@Transactional
public class TripShareService {
    private final TripShareRepository shares;
    private final UserRepository users;
    private final SecureRandom random = new SecureRandom();
    public TripShareService(TripShareRepository shares, UserRepository users) {
        this.shares = shares;
        this.users = users;
    }
    public record Create(@NotBlank @Size(max=500) String origin,
            @NotBlank @Size(max=500) String destination,
            @NotBlank @Size(max=2000) String routeSummary,
            @NotNull @Future Instant estimatedArrival,
            boolean liveLocation) {}
    public record Location(@NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
            @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude) {}
    public record View(UUID id, String token, String origin, String destination, String routeSummary,
            Instant estimatedArrival, Instant expiresAt, boolean liveLocation,
            Double latitude, Double longitude, Instant locationUpdatedAt) {}
    // What a recipient sees: no share id or token.
    public record PublicView(String origin, String destination, String routeSummary,
            Instant estimatedArrival, Instant expiresAt, boolean liveLocation,
            Double latitude, Double longitude, Instant locationUpdatedAt) {}
    private Long owner(String email) {
        return users.findByEmail(email).orElseThrow(() -> unavailable()).getId();
    }
    private ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "This sharing link is invalid or has ended.");
    }
    private void requireActive(TripShare share) {
        if (share.revoked || !share.expiresAt.isAfter(Instant.now())) throw unavailable();
    }
    private View view(TripShare s) {
        return new View(s.id, s.token, s.origin, s.destination, s.routeSummary,
                s.estimatedArrival, s.expiresAt, s.liveLocation, s.latitude, s.longitude, s.locationUpdatedAt);
    }
    public View create(String email, Create request) {
        var s = new TripShare();
        s.userId = owner(email);
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        s.token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        s.origin = request.origin().trim();
        s.destination = request.destination().trim();
        s.routeSummary = request.routeSummary().trim();
        s.estimatedArrival = request.estimatedArrival();
        // Arrival confirmation revokes the link; this is a privacy backup if the user forgets.
        s.expiresAt = Instant.now().plusSeconds(24 * 60 * 60L);
        s.liveLocation = request.liveLocation();
        return view(shares.save(s));
    }
    @Transactional(readOnly=true)
    public List<View> active(String email) {
        return shares.findByUserIdAndRevokedFalseAndExpiresAtAfter(owner(email), Instant.now())
                .stream().map(this::view).toList();
    }
    @Transactional(readOnly=true)
    public PublicView read(String token) {
        var s = shares.findByToken(token).orElseThrow(() -> unavailable());
        // Tell family the trip ended safely, without trip details. Expired links reveal nothing, not even arrival.
        if (s.arrived && s.expiresAt.isAfter(Instant.now()))
            throw new ResponseStatusException(HttpStatus.GONE, "They have arrived. Trip sharing has ended.");
        requireActive(s);
        return new PublicView(s.origin, s.destination, s.routeSummary, s.estimatedArrival, s.expiresAt,
                s.liveLocation, s.latitude, s.longitude, s.locationUpdatedAt);
    }
    public void update(String email, UUID id, Location location) {
        var s = shares.lockOwned(id, owner(email)).orElseThrow(() -> unavailable());
        requireActive(s);
        if (!s.liveLocation) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Live location is disabled.");
        s.latitude = location.latitude();
        s.longitude = location.longitude();
        s.locationUpdatedAt = Instant.now();
    }
    public void stop(String email, UUID id, boolean arrived) {
        var s = shares.lockOwned(id, owner(email)).orElseThrow(() -> unavailable());
        if (s.revoked) return; // Already ended: keep the first outcome, e.g. "arrived".
        s.revoked = true;
        s.arrived = arrived;
        s.latitude = null;
        s.longitude = null;
        s.locationUpdatedAt = null;
    }
    // Privacy: once the 24-hour backup expiry passes, delete the share and its last location.
    @Scheduled(fixedRate = 10, timeUnit = TimeUnit.MINUTES)
    public void deleteExpired() {
        shares.deleteExpired(Instant.now());
    }
}
