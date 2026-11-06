package com.silverroute.service;

import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import com.silverroute.api.*;
import com.silverroute.routing.*;
import com.silverroute.tool.*;
import com.silverroute.exception.RouteDataUnavailableException;
import com.silverroute.exception.InvalidAddressException;
import com.silverroute.exception.AddressConfirmationRequiredException;
import com.silverroute.exception.AddressNotFoundException;

/** Deterministic collection: the model ranks only after all relevant sources have been attempted. */
@Service
public class RouteDataAggregatorService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(RouteDataAggregatorService.class);
    private final RouteDataTool routes;
    private final RouteConditionsService conditions;
    private final Clock clock;
    private final double heatThreshold;
    @org.springframework.beans.factory.annotation.Autowired
    public RouteDataAggregatorService(RouteDataTool routes,RouteConditionsService conditions,
            @org.springframework.beans.factory.annotation.Value("${routing.weather.heat-threshold-celsius:30}") double heatThreshold) {
        this(routes,conditions,Clock.systemUTC(),heatThreshold);
    }
    public RouteDataAggregatorService(RouteDataTool routes,RouteConditionsService conditions) {
        this(routes,conditions,Clock.systemUTC(),WeatherSummary.DEFAULT_HEAT_THRESHOLD);
    }
    public RouteDataAggregatorService(RouteDataTool routes,RouteConditionsService conditions,Clock clock) {
        this(routes,conditions,clock,WeatherSummary.DEFAULT_HEAT_THRESHOLD);
    }
    public RouteDataAggregatorService(RouteDataTool routes,RouteConditionsService conditions,Clock clock,double heatThreshold) {
        if (!Double.isFinite(heatThreshold)) throw new IllegalArgumentException("Heat threshold must be finite");
        this.routes=routes; this.conditions=conditions; this.clock=clock; this.heatThreshold=heatThreshold;
    }
    public AggregatedTrip aggregate(TripRequest request,SavedPreferences preferences) {
        var localTime=OneMapService.singaporeDeparture(request.departureTime());
        var localRequest=new TripRequest(request.origin(),request.destination(),localTime,request.originCoordinates(),request.destinationCoordinates());
        ToolExecutionResult result;
        try { result=preferences.walkingOnlyEnabled() ? routes.execute(localRequest,preferences) : routes.execute(localRequest); }
        catch(RouteDataUnavailableException | InvalidAddressException | AddressNotFoundException | AddressConfirmationRequiredException exception) { throw exception; }
        catch(Exception exception) {
            // Keep the real cause in the server log; users get a plain message instead.
            log.warn("Route data could not be retrieved", exception);
            throw new RouteDataUnavailableException("Routes are temporarily unavailable. Please try again in a few minutes.");
        }
        if(result==null || result.routes().isEmpty()) throw new RouteDataUnavailableException(OneMapService.noRouteMessage(localTime));
        boolean live=!request.departureTime().toInstant().isAfter(clock.instant().plusSeconds(900))
                && !request.departureTime().toInstant().isBefore(clock.instant().minusSeconds(900));
        List<String> warnings=new ArrayList<>(result.warnings());
        if(!live) warnings.add("Live bus arrivals, rainfall, temperature and crowding are excluded: departure is outside the current 15-minute window; future or historical conditions are unavailable.");
        List<RouteOption> routesWithConditions=new ArrayList<>();
        Map<String,EvidenceCache.Snapshot> requestCache=new HashMap<>();
        for(var route:result.routes()) {
            if(MockRouteDataTool.NAME.equals(result.source())) routesWithConditions.add(route);
            else routesWithConditions.add(conditions.attachConditions(route,live,requestCache));
        }
        Set<String> sources=new LinkedHashSet<>(List.of(result.source()));
        for(var route:routesWithConditions) {
            warnings.addAll(route.warnings());
            route.evidence().stream().filter(e -> "available".equals(e.availability())).map(RouteEvidence::source).forEach(sources::add);
        }
        var context=new RouteContext(new RouteContext.Trip(request.origin(),request.destination(),localTime.toString()),
                preferences,routesWithConditions.stream().map(route -> RouteContext.Candidate.from(route,heatThreshold)).toList(),List.copyOf(new LinkedHashSet<>(warnings)),
                routesWithConditions.stream().anyMatch(RouteOption::isWalkingOnly) ? 2 : 3);
        return new AggregatedTrip(context,List.copyOf(routesWithConditions),List.copyOf(sources));
    }
}
