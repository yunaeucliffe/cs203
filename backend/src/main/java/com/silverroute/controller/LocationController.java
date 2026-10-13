package com.silverroute.controller;

import com.silverroute.service.OneMapService;
import org.springframework.web.bind.annotation.*;

import com.silverroute.api.LocationResult;
import com.silverroute.api.LocationSuggestion;
import org.springframework.http.ResponseEntity;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/location")
@CrossOrigin(origins = "*")

// Handles requests from outside of backend
public class LocationController {

    private final OneMapService oneMapService;

    public LocationController(OneMapService oneMapService) {
        this.oneMapService = oneMapService;
    }

    // A compact response for autocomplete; provider details stay server-side.
    @GetMapping("/suggestions")
    public ResponseEntity<?> suggestions(@RequestParam String query) {
        String trimmed = query.trim();
        if (trimmed.length() > 500) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Location query is too long."));
        }
        if (trimmed.length() < 2) return ResponseEntity.ok(List.<LocationSuggestion>of());
        try {
            return ResponseEntity.ok(
                    oneMapService.parseSuggestions(oneMapService.searchLocation(trimmed)));
        } catch (Exception exception) {
            return ResponseEntity.status(503)
                    .body(Map.of("message", "Location suggestions are unavailable. Try again."));
        }
    }

    // Returns raw OneMap location search data
    @GetMapping("/search")
    public String searchLocation(@RequestParam String query) {
        return oneMapService.searchLocation(query);
    }

    // Returns simplified LocationResult
    @GetMapping("/parsed")
    public LocationResult searchLocationParsed(@RequestParam String query) throws Exception {
        String json = oneMapService.searchLocation(query);
        return oneMapService.parseLocation(json);
    }
}
