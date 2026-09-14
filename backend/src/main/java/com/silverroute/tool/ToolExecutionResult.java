package com.silverroute.tool;

import java.util.List;

import com.silverroute.api.RouteOption;

public record ToolExecutionResult(
        String source,
        List<RouteOption> routes,
        List<String> warnings) {

    public ToolExecutionResult {
        routes = List.copyOf(routes);
        warnings = List.copyOf(warnings);
    }
}
