package com.silverroute.controller;

import java.util.*;

import com.silverroute.service.OneMapService;
import org.springframework.web.bind.annotation.*;

import com.silverroute.api.RouteOption;

@RestController
@RequestMapping("/api/route")
@CrossOrigin(origins = "*")
public class RouteController {

    private final OneMapService oneMapService;

    public RouteController(OneMapService oneMapService) {
        this.oneMapService = oneMapService;
    }

    @GetMapping
    public String getRoute(
            @RequestParam double originLat,
            @RequestParam double originLon,
            @RequestParam double destinationLat,
            @RequestParam double destinationLon) {

        return oneMapService.getRoute(
                originLat,
                originLon,
                destinationLat,
                destinationLon);
    }

    @GetMapping("/parsed")
    public List<RouteOption> getParsedRoute(
            @RequestParam double originLat,
            @RequestParam double originLon,
            @RequestParam double destinationLat,
            @RequestParam double destinationLon) throws Exception {

        String json = oneMapService.getRoute(
                originLat,
                originLon,
                destinationLat,
                destinationLon);

        return oneMapService.parseRoutes(json);
    }
}
