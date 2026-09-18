package com.silverroute.controller;

import java.util.*;

import com.silverroute.service.OneMapService;
import org.springframework.web.bind.annotation.*;

import com.silverroute.api.RouteOption;

import java.time.OffsetDateTime;

@RestController
@RequestMapping("/api/route")
@CrossOrigin(origins = "*")

// Temporary testing interface for routing
public class RouteController {

    private final OneMapService oneMapService;

    public RouteController(OneMapService oneMapService) {
        this.oneMapService = oneMapService;
    }

    // Raw OneMap route response
    @GetMapping
    public String getRoute(
            @RequestParam double originLat,
            @RequestParam double originLon,
            @RequestParam double destinationLat,
            @RequestParam double destinationLon,
            @RequestParam OffsetDateTime departureTime) {

        return oneMapService.getRoute(
                originLat,
                originLon,
                destinationLat,
                destinationLon,
                departureTime);
    }

    // Cleaned up RouteOptions
    @GetMapping("/parsed")
    public List<RouteOption> getParsedRoute(
            @RequestParam double originLat,
            @RequestParam double originLon,
            @RequestParam double destinationLat,
            @RequestParam double destinationLon,
            @RequestParam OffsetDateTime departureTime) throws Exception {

        String json = oneMapService.getRoute(
                originLat,
                originLon,
                destinationLat,
                destinationLon,
                departureTime);

        return oneMapService.parseRoutes(json);
    }
}
