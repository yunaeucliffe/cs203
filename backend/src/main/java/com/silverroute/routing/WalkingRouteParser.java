package com.silverroute.routing;

import java.time.OffsetDateTime;
import java.util.List;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.silverroute.api.LocationResult;
import com.silverroute.api.RouteOption;

/** OneMap walking responses use a different schema from public-transport itineraries. */
public final class WalkingRouteParser {
    public RouteOption parse(String json, LocationResult origin, LocationResult destination,
            OffsetDateTime departure) throws Exception {
        var root = new ObjectMapper().readTree(json);
        if (root == null || !root.path("status").isIntegralNumber() || root.path("status").asInt() != 0)
            throw new IllegalArgumentException("No valid walking route");
        Double distance = RouteParser.number(root.path("route_summary"), "total_distance");
        Double seconds = RouteParser.number(root.path("route_summary"), "total_time");
        var path = RouteParser.decodePolyline(RouteParser.text(root, "route_geometry"));
        if (distance == null || seconds == null || seconds > Integer.MAX_VALUE || path.size() < 2
                || path.stream().anyMatch(p -> p.size() != 2 || !Double.isFinite(p.get(0)) || !Double.isFinite(p.get(1))
                        || Math.abs(p.get(0)) > 90 || Math.abs(p.get(1)) > 180))
            throw new IllegalArgumentException("Walking route metrics or geometry are unavailable");
        int minutes = (int)Math.ceil(seconds / 60);
        var leg = new RouteLeg("WALK", null,
                new RouteLeg.Stop(null, null, origin.name(), origin.latitude(), origin.longitude()),
                new RouteLeg.Stop(null, null, destination.name(), destination.latitude(), destination.longitude()),
                seconds, distance, departure.toInstant().toString(), departure.toInstant().plusSeconds((long)Math.ceil(seconds)).toString(), path);
        return new RouteOption("onemap-walk", "Walk all the way", minutes, minutes, 0, distance, distance,
                null, List.of(leg), List.of(path), List.of(), List.of(), List.of());
    }
}
