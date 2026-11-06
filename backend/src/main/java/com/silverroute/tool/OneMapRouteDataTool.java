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

        return execute(request, new com.silverroute.routing.SavedPreferences("Normal", 50, 20));
    }

    @Override
    public ToolExecutionResult execute(TripRequest request, com.silverroute.routing.SavedPreferences preferences) throws Exception {
        var origin = resolve(request.origin(), request.originCoordinates());
        var destination = resolve(request.destination(), request.destinationCoordinates());
        var routes = new java.util.ArrayList<RouteOption>();
        var warnings = new java.util.ArrayList<String>();
        RouteOption walking = null;
        Exception transitFailure = null;
        try {
            var supplied = oneMapService.parseRoutes(oneMapService.getRoute(origin.latitude(), origin.longitude(),
                    destination.latitude(), destination.longitude(), request.departureTime()));
            for (var route : supplied) {
                if (!route.isWalkingOnly()) routes.add(route);
                else if (eligible(route, preferences) && (walking == null || route.walkingDistanceMeters() < walking.walkingDistanceMeters()))
                    walking = route;
            }
        } catch (com.silverroute.exception.InvalidAddressException exception) {
            throw exception;
        } catch (Exception exception) {
            transitFailure = exception;
        }
        if (preferences.walkingOnlyEnabled()) {
            try {
                var candidate = new com.silverroute.routing.WalkingRouteParser().parse(
                        oneMapService.getWalkingRoute(origin.latitude(), origin.longitude(), destination.latitude(), destination.longitude()),
                        origin, destination, request.departureTime());
                if (eligible(candidate, preferences)) walking = candidate;
            } catch (com.silverroute.exception.InvalidAddressException exception) {
                throw exception;
            } catch (Exception exception) {
                if (walking == null) warnings.add("The walking-only route could not be retrieved; public transport options are shown when available.");
            }
        }
        if (walking != null) routes.add(walking);
        if (routes.isEmpty()) {
            if (transitFailure != null) throw transitFailure;
            throw new com.silverroute.exception.RouteDataUnavailableException("No routes are available within your current travel settings. Try different locations or a larger walking limit.");
        }
        if (routes.stream().allMatch(RouteOption::isWalkingOnly))
            warnings.add("Public transport is unavailable for this search. A walking-only option is available.");
        return new ToolExecutionResult(NAME, List.copyOf(routes), List.copyOf(warnings));
    }

    private boolean eligible(RouteOption route, com.silverroute.routing.SavedPreferences preferences) {
        return preferences.walkingOnlyEnabled() && route.isWalkingOnly() && route.walkingDistanceMeters() != null
                && Double.isFinite(route.walkingDistanceMeters()) && route.walkingDistanceMeters() >= 0
                && route.walkingDistanceMeters() <= preferences.walkingOnlyMaxDistanceMeters()
                && route.durationMinutes() != null && route.durationMinutes() >= 0
                && route.legs().stream().allMatch(leg -> leg.path().size() >= 2);
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
