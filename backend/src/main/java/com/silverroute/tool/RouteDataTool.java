package com.silverroute.tool;

import com.silverroute.api.TripRequest;

public interface RouteDataTool {

    default ToolExecutionResult execute(TripRequest request, com.silverroute.routing.SavedPreferences preferences) throws Exception {
        return execute(request);
    }

    ToolExecutionResult execute(TripRequest request) throws Exception;
}
