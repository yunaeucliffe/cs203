package com.silverroute.controller;

import com.silverroute.service.LtaDataMallService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/lta")
@CrossOrigin(origins = "*")
public class LtaDataMallController {

    private final LtaDataMallService ltaDataMallService;

    public LtaDataMallController(LtaDataMallService ltaDataMallService) {
        this.ltaDataMallService = ltaDataMallService;
    }

    @GetMapping("/bus-arrivals")
    public String busArrivals(@RequestParam String busStopCode) {
        return ltaDataMallService.getBusArrivals(busStopCode);
    }

    @GetMapping("/bus-stops")
    public String busStops(@RequestParam(defaultValue = "0") int skip) {
        return ltaDataMallService.getBusStops(skip);
    }

    @GetMapping("/bus-routes")
    public String busRoutes(@RequestParam(defaultValue = "0") int skip) {
        return ltaDataMallService.getBusRoutes(skip);
    }

    @GetMapping("/bus-services")
    public String busServices(@RequestParam(defaultValue = "0") int skip) {
        return ltaDataMallService.getBusServices(skip);
    }

    @GetMapping("/train-alerts")
    public String trainAlerts() {
        return ltaDataMallService.getTrainServiceAlerts();
    }

    @GetMapping("/station-crowding")
    public String stationCrowding(@RequestParam String trainLine) {
        return ltaDataMallService.getStationCrowdDensity(trainLine);
    }

    @GetMapping("/facilities-maintenance")
    public String facilitiesMaintenance() {
        return ltaDataMallService.getFacilitiesMaintenance();
    }
}
