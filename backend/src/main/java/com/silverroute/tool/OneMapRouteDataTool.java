package com.silverroute.tool;

import java.util.List;

import org.springframework.stereotype.Component;

import com.silverroute.api.RouteOption;
import com.silverroute.api.TripRequest;
import com.silverroute.service.OneMapService;

// Connects OneMap to agent system
// Gets user's origin and destination
// Searches both locations --> gets coordinates --> gets routes --> parses
// Returns List<RouteOption> to agent
@Component
public class OneMapRouteDataTool implements RouteDataTool {

    public static final String NAME = "onemap-route-data";

    private final OneMapService oneMapService;

    public OneMapRouteDataTool(OneMapService oneMapService) {
        this.oneMapService = oneMapService;
    }

    @Override
    public String name() {
        return NAME;
    }

    @Override
    public String description() {
        return "Gets real public-transport route options from OneMap";
    }

    // 
    @Override
    public ToolExecutionResult execute(TripRequest request) throws Exception {

        String originJson = oneMapService.searchLocation(request.origin());
        String destinationJson = oneMapService.searchLocation(request.destination());

        var origin = oneMapService.parseLocation(originJson);
        var destination = oneMapService.parseLocation(destinationJson);

        String routeJson = oneMapService.getRoute(
                origin.latitude(),
                origin.longitude(),
                destination.latitude(),
                destination.longitude(),
                request.departureTime());

        List<RouteOption> routes = oneMapService.parseRoutes(routeJson);

        return new ToolExecutionResult(
                NAME,
                routes,
                List.of());
    }
}
