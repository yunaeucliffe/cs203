package com.silverroute.api;

import com.silverroute.routing.RouteEvidence;
import com.silverroute.service.RouteConditionsService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/bus-arrival-estimates")
public class BusArrivalController {
    private final RouteConditionsService conditions;
    public BusArrivalController(RouteConditionsService conditions) { this.conditions=conditions; }

    @GetMapping
    public RouteEvidence arrivals(@RequestParam String busStopCode,@RequestParam String service) {
        if(!busStopCode.matches("[0-9]{5}") || !service.matches("[A-Za-z0-9]{1,10}"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid bus stop or service");
        return conditions.refreshBusArrivals(busStopCode,service);
    }
}
