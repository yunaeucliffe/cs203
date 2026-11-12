package com.silverroute.controller;

import java.util.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.silverroute.service.TripShareService;
import com.silverroute.service.TripShareService.*;

@RestController
public class TripShareController {
    private final TripShareService service;
    public TripShareController(TripShareService service) { this.service = service; }
    @GetMapping("/api/users/me/trip-shares")
    public ResponseEntity<List<View>> active(Authentication auth) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.active(auth.getName()));
    }
    @PostMapping("/api/users/me/trip-shares")
    public ResponseEntity<View> create(Authentication auth, @Valid @RequestBody Create request, HttpServletRequest http) {
        // The service re-checks the stored session: another tab may sign out while this request is in flight.
        var session = http.getSession(false);
        var share = service.create(auth.getName(), request, session == null ? null : session.getId());
        return ResponseEntity.status(201).cacheControl(CacheControl.noStore()).body(share);
    }
    @PutMapping("/api/users/me/trip-shares/{id}/location")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void update(Authentication auth, @PathVariable UUID id, @Valid @RequestBody Location location) {
        service.update(auth.getName(), id, location);
    }
    @DeleteMapping("/api/users/me/trip-shares/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void stop(Authentication auth, @PathVariable UUID id, @RequestParam(defaultValue = "false") boolean arrived) {
        service.stop(auth.getName(), id, arrived);
    }
    @GetMapping("/api/shared-trips/{token}")
    public ResponseEntity<PublicView> read(@PathVariable String token) {
        // Invalid, expired or revoked links become a 404 (410 after arrival) with only a message (GlobalExceptionHandler).
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.read(token));
    }
}
