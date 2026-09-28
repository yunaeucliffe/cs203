package com.silverroute.tool;

import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import com.silverroute.api.*;

@Component
@Profile("mock")
public class MockRouteDataTool implements RouteDataTool {
    public static final String NAME = "mock-route-data";
    public String name() { return NAME; }
    public String description() { return "Explicit demo routes; never live navigation data"; }
    public ToolExecutionResult execute(TripRequest request) {
        return new ToolExecutionResult(NAME, List.of(route("route-1",32,5,0),
                route("route-2",29,12,1), route("route-3",38,3,1)), List.of("Mock data; not for navigation"));
    }
    private RouteOption route(String id, int duration, int walking, int transfers) {
        return new RouteOption(id, "Demo itinerary", duration, walking, transfers, "unknown", null, null,
                null, List.of(), List.of(), List.of(), List.of(), List.of("Mock data; not for navigation"));
    }
}
