package com.silverroute.routing;

import java.util.List;
import com.silverroute.api.RouteOption;

public record AggregatedTrip(RouteContext context, List<RouteOption> routes, List<String> sources) {}
