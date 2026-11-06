package com.silverroute.tool;

import java.util.List;

import org.springframework.stereotype.Component;

import com.silverroute.api.RouteOption;
import com.silverroute.api.TripRequest;
import com.silverroute.exception.AddressConfirmationRequiredException;
import com.silverroute.exception.AddressNotFoundException;
import com.silverroute.service.OneMapService;
// Connects OneMap to agent system
// Gets user's origin and destination
// Searches both locations --> gets coordinates --> gets routes --> parses
// Returns List<RouteOption> to agent
@Component
@org.springframework.context.annotation.Profile("!mock")
public class OneMapRouteDataTool implements RouteDataTool {

    public static final String NAME = "onemap-route-data";

    private final OneMapService oneMapService;

    public OneMapRouteDataTool(OneMapService oneMapService) {
        this.oneMapService = oneMapService;
    }

    @Override
    public ToolExecutionResult execute(TripRequest request) throws Exception {

        var origin = resolve(request.origin(), request.originCoordinates());
        var destination = resolve(request.destination(), request.destinationCoordinates());

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
    private com.silverroute.api.LocationResult resolve(
            String name,
            TripRequest.Coordinates coordinates) throws Exception {

        if (coordinates != null) {
            return new com.silverroute.api.LocationResult(
                    name, coordinates.latitude(), coordinates.longitude());
        }

        try {
            return oneMapService.parseLocation(
                    oneMapService.searchLocation(name));
        } catch (AddressNotFoundException exception) {
            List<com.silverroute.api.LocationSuggestion> alternatives =
                    oneMapService.findAlternativeLocations(name);

            if (alternatives.isEmpty()) {
                throw exception;
            }

            List<com.silverroute.api.LocationResult> locations =
                    alternatives.stream()
                            .map(location -> new com.silverroute.api.LocationResult(
                                    location.name(),
                                    location.latitude(),
                                    location.longitude()))
                            .toList();

            throw new AddressConfirmationRequiredException(name, locations);
        }
    }
}
