package com.silverroute.agent;

import java.util.List;

import com.silverroute.api.RouteOption;

public record ToolObservation(
        String toolName,
        boolean successful,
        String source,
        List<RouteOption> routes,
        List<String> warnings) {

    public static ToolObservation success(
            String toolName,
            String source,
            List<RouteOption> routes,
            List<String> warnings) {
        return new ToolObservation(toolName, true, source, List.copyOf(routes), List.copyOf(warnings));
    }

    public static ToolObservation failure(String toolName, String warning) {
        return new ToolObservation(toolName, false, toolName, List.of(), List.of(warning));
    }
}
