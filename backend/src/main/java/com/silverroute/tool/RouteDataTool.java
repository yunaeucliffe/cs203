package com.silverroute.tool;

import com.silverroute.api.TripRequest;

public interface RouteDataTool {

    ToolExecutionResult execute(TripRequest request) throws Exception;
}
