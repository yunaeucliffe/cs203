package com.silverroute.controller;

import com.silverroute.service.OneMapService;
import org.springframework.web.bind.annotation.*;

import com.silverroute.api.LocationResult;

@RestController
@RequestMapping("/api/location")
@CrossOrigin(origins = "*")

// Handles requests from outside of backend
public class LocationController {

    private final OneMapService oneMapService;

    public LocationController(OneMapService oneMapService) {
        this.oneMapService = oneMapService;
    }

    // Returns raw OneMap location search data
    @GetMapping("/search")
    public String searchLocation(@RequestParam String query) {
        return oneMapService.searchLocation(query);
    }

    // Returns simplified LocationResult
    @GetMapping("/candidates")
    public java.util.List<LocationResult> searchLocationCandidates(@RequestParam String query) throws Exception {
        return oneMapService.parseLocations(oneMapService.searchLocation(query));
    }

    @GetMapping("/parsed")
    public LocationResult searchLocationParsed(@RequestParam String query) throws Exception {
        String json = oneMapService.searchLocation(query);
        return oneMapService.parseLocation(json);
    }
}
