package com.silverroute.controller;

import com.silverroute.service.OneMapService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/location")
@CrossOrigin(origins = "*")
public class LocationController {

    private final OneMapService oneMapService;

    public LocationController(OneMapService oneMapService) {
        this.oneMapService = oneMapService;
    }

    @GetMapping("/search")
    public String searchLocation(@RequestParam String query) {
        return oneMapService.searchLocation(query);
    }
}
