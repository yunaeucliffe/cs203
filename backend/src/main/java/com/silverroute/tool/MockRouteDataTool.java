package com.silverroute.tool;

import java.util.List;

import org.springframework.stereotype.Component;

import com.silverroute.api.RouteOption;
import com.silverroute.api.TripRequest;

@Component
public class MockRouteDataTool implements RouteDataTool {

    public static final String NAME = "mock-route-data";

    @Override
    public String name() {
        return NAME;
    }

    @Override
    public String description() {
        return "Returns deterministic sample public-transport routes for a trip request";
    }

    @Override
    public ToolExecutionResult execute(TripRequest request) {
        List<RouteOption> routes = List.of(
                new RouteOption(
                        "route-1",
                        "Take Bus 97 directly from " + request.origin() + " to " + request.destination(),
                        32,
                        5,
                        0,
                        true),
                new RouteOption(
                        "route-2",
                        "Take the MRT and transfer to Bus 95",
                        29,
                        12,
                        1,
                        true),
                new RouteOption(
                        "route-3",
                        "Take two connecting buses",
                        38,
                        3,
                        1,
                        false));

        return new ToolExecutionResult(NAME, routes, List.of());
    }
}
