package com.silverroute.api;

import com.silverroute.routing.RouteEvidence;
import com.silverroute.service.RouteEnrichmentService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/bus-arrival-estimates")
public class BusArrivalController {
    private final RouteEnrichmentService enrichment;
    public BusArrivalController(RouteEnrichmentService enrichment) { this.enrichment=enrichment; }

    @GetMapping
    public RouteEvidence arrivals(@RequestParam String busStopCode,@RequestParam String service) {
        if(!busStopCode.matches("[0-9]{5}") || !service.matches("[A-Za-z0-9]{1,10}"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid bus stop or service");
        return enrichment.refreshBusArrivals(busStopCode,service);
    }
}
