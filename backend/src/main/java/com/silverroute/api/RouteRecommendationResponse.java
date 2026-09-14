package com.silverroute.api;

import java.util.List;

public record RouteRecommendationResponse(
        String requestId,
        RouteOption recommendedRoute,
        List<RouteOption> alternatives,
        List<String> reasons,
        List<String> warnings,
        List<String> sources,
        String engine) {
}
