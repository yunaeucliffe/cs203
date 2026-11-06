package com.silverroute.tool;

import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import com.silverroute.api.*;

@Component
@Profile("mock")
public class MockRouteDataTool implements RouteDataTool {
    public static final String NAME = "mock-route-data";
    public ToolExecutionResult execute(TripRequest request) {
        return new ToolExecutionResult(NAME, List.of(route("route-1",32,5,0),
                route("route-2",29,12,1), route("route-3",38,3,1)), List.of("Mock data; not for navigation"));
    }
    @Override
    public ToolExecutionResult execute(TripRequest request, com.silverroute.routing.SavedPreferences preferences) {
        var baseline = execute(request);
        if (!preferences.walkingOnlyEnabled() || preferences.walkingOnlyMaxDistanceMeters() < 400) return baseline;
        var origin = request.originCoordinates() == null ? new TripRequest.Coordinates(1.3,103.8) : request.originCoordinates();
        var destination = request.destinationCoordinates() == null ? new TripRequest.Coordinates(1.303,103.801) : request.destinationCoordinates();
        var path = List.of(List.of(origin.latitude(),origin.longitude()), List.of(destination.latitude(),destination.longitude()));
        var leg = new com.silverroute.routing.RouteLeg("WALK",null,
                new com.silverroute.routing.RouteLeg.Stop(null,null,request.origin(),origin.latitude(),origin.longitude()),
                new com.silverroute.routing.RouteLeg.Stop(null,null,request.destination(),destination.latitude(),destination.longitude()),
                300.0,400.0,request.departureTime().toInstant().toString(),request.departureTime().plusMinutes(5).toInstant().toString(),path);
        var walking = new RouteOption("mock-walk","Walk all the way",5,5,0,400.0,400.0,200.0,
                List.of(leg),List.of(path),List.of(),List.of(),List.of("Mock data; not for navigation"));
        var routes = new java.util.ArrayList<>(baseline.routes());
        routes.add(walking);
        return new ToolExecutionResult(NAME,List.copyOf(routes),baseline.warnings());
    }

    private RouteOption route(String id, int duration, int walking, int transfers) {
        return new RouteOption(id, "Demo itinerary", duration, walking, transfers, null, null,
                null, List.of(), List.of(), List.of(), List.of(), List.of("Mock data; not for navigation"));
    }
}
