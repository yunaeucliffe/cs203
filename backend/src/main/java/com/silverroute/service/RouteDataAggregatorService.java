package com.silverroute.service;

import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import com.silverroute.api.*;
import com.silverroute.routing.*;
import com.silverroute.tool.*;
import com.silverroute.exception.RouteDataUnavailableException;

/** Deterministic collection: the model ranks only after all relevant sources have been attempted. */
@Service
public class RouteDataAggregatorService {
    private final RouteDataTool routes;
    private final RouteEnrichmentService enrichment;
    private final Clock clock;
    @org.springframework.beans.factory.annotation.Autowired
    public RouteDataAggregatorService(RouteDataTool routes,RouteEnrichmentService enrichment) {
        this(routes,enrichment,Clock.systemUTC());
    }
    public RouteDataAggregatorService(RouteDataTool routes,RouteEnrichmentService enrichment,Clock clock) {
        this.routes=routes; this.enrichment=enrichment; this.clock=clock;
    }
    public AggregatedTrip aggregate(TripRequest request,SavedPreferences preferences) {
        var localTime=OneMapService.singaporeDeparture(request.departureTime());
        var localRequest=new TripRequest(request.origin(),request.destination(),localTime,request.originCoordinates(),request.destinationCoordinates());
        ToolExecutionResult result;
        try { result=routes.execute(localRequest); }
        catch(Exception exception) { throw new RouteDataUnavailableException("Route data could not be retrieved from OneMap"); }
        if(result==null || result.routes().isEmpty()) throw new RouteDataUnavailableException("No public transport routes were found");
        boolean live=!request.departureTime().toInstant().isAfter(clock.instant().plusSeconds(900))
                && !request.departureTime().toInstant().isBefore(clock.instant().minusSeconds(900));
        List<String> warnings=new ArrayList<>(result.warnings());
        if(!live) warnings.add("Live bus arrivals, rainfall and crowding are excluded: departure is outside the current 15-minute window; future or historical conditions are unavailable.");
        List<RouteOption> enriched=new ArrayList<>();
        Map<String,EvidenceCache.Snapshot> requestCache=new HashMap<>();
        for(var route:result.routes()) {
            if(MockRouteDataTool.NAME.equals(result.source())) enriched.add(route);
            else enriched.add(enrichment.enrich(route,live,requestCache));
        }
        Set<String> sources=new LinkedHashSet<>(List.of(result.source()));
        for(var route:enriched) {
            warnings.addAll(route.warnings());
            route.evidence().stream().filter(e -> "available".equals(e.availability())).map(RouteEvidence::source).forEach(sources::add);
        }
        var context=new RouteContext(new RouteContext.Trip(request.origin(),request.destination(),localTime.toString()),
                preferences,enriched.stream().map(RouteContext.Candidate::from).toList(),List.copyOf(new LinkedHashSet<>(warnings)));
        return new AggregatedTrip(context,List.copyOf(enriched),List.copyOf(sources));
    }
}
