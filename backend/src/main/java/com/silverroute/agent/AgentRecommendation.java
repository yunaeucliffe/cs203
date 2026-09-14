package com.silverroute.agent;

import java.util.List;

import com.silverroute.api.RouteOption;

public record AgentRecommendation(
        RouteOption recommendedRoute,
        List<RouteOption> alternatives,
        List<String> reasons,
        List<String> warnings,
        List<String> sources,
        String engine) {
}
