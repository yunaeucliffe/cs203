package com.silverroute.tool;

import com.silverroute.api.TripRequest;

public interface RouteDataTool {

    String name();

    String description();

    ToolExecutionResult execute(TripRequest request) throws Exception;
}
