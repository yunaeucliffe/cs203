package com.silverroute.agent;

import com.silverroute.routing.RouteContext;

public interface ModelGateway {
    RankingResult rank(RouteContext context);
    default String engine() { return "unknown"; }
}
