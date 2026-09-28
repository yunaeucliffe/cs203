package com.silverroute.routing;

import java.time.Instant;
import java.util.*;
import com.fasterxml.jackson.databind.*;
import com.silverroute.api.RouteOption;

/** Loss-aware adapter for OneMap/OTP itineraries. Distances are metres, durations seconds. */
public final class RouteParser {
    private final ObjectMapper mapper = new ObjectMapper();

    public List<RouteOption> parse(String json) throws Exception {
        JsonNode itineraries = mapper.readTree(json).path("plan").path("itineraries");
        if (!itineraries.isArray()) throw new IllegalArgumentException("OneMap did not return an itinerary array");
        List<RouteOption> routes = new ArrayList<>();
        for (JsonNode itinerary : itineraries) {
            if (!itinerary.path("legs").isArray() || itinerary.path("legs").isEmpty()) continue;
            List<RouteLeg> legs = new ArrayList<>();
            List<String> warnings = new ArrayList<>(List.of("Accessibility has not been verified."));
            for (JsonNode leg : itinerary.path("legs")) {
                List<List<Double>> path;
                try { path = decodePolyline(text(leg.path("legGeometry"), "points")); }
                catch (IllegalArgumentException exception) {
                    path = List.of(); warnings.add("A route leg has invalid map geometry.");
                }
                legs.add(new RouteLeg(text(leg,"mode"), first(text(leg,"routeShortName"), text(leg,"route")),
                        stop(leg.path("from")), stop(leg.path("to")), number(leg,"duration"),
                        number(leg,"distance"), time(leg.get("startTime")), time(leg.get("endTime")), path));
            }
            Integer duration = minutes(itinerary,"duration");
            Integer walking = minutes(itinerary,"walkTime");
            Integer transfers = integer(itinerary,"transfers");
            Double walkDistance = number(itinerary,"walkDistance");
            if (walkDistance == null) {
                var walkingLegs = legs.stream().filter(l -> "WALK".equals(l.mode())).toList();
                walkDistance = walkingLegs.isEmpty()
                        ? (walking != null && walking == 0 ? 0.0 : null) : sumDistance(walkingLegs);
            }
            if (duration == null || walking == null || transfers == null || walkDistance == null)
                warnings.add("Some provider route metrics are unavailable.");
            String summary = String.join(" → ", legs.stream().map(l ->
                    (l.mode() == null ? "UNKNOWN" : l.mode()) + (l.service() == null ? "" : " " + l.service())).toList());
            routes.add(new RouteOption("onemap-route-" + (routes.size()+1), summary, duration, walking, transfers,
                    "unknown", walkDistance, sumDistance(legs), null, legs,
                    legs.stream().map(RouteLeg::path).filter(p -> !p.isEmpty()).toList(), List.of(), List.of(), warnings));
        }
        return List.copyOf(routes);
    }
    private RouteLeg.Stop stop(JsonNode node) {
        return new RouteLeg.Stop(text(node,"stopId"), text(node,"stopCode"), text(node,"name"),
                coordinate(node,"lat",90), coordinate(node,"lon",180));
    }
    private Double coordinate(JsonNode node, String key, int max) {
        JsonNode value = node.get(key);
        return value != null && value.isNumber() && Double.isFinite(value.doubleValue())
                && Math.abs(value.doubleValue()) <= max ? value.doubleValue() : null;
    }
    private static String time(JsonNode value) {
        if (value == null || value.isNull()) return null;
        if (value.isIntegralNumber()) {
            try { return Instant.ofEpochMilli(value.longValue()).toString(); } catch (RuntimeException ignored) { return null; }
        }
        return value.isTextual() ? value.textValue() : null;
    }
    public static String text(JsonNode node, String key) {
        JsonNode value = node.get(key);
        return value != null && value.isValueNode() && !value.isNull() && !value.asText().isBlank() ? value.asText() : null;
    }
    private static String first(String a, String b) { return a == null ? b : a; }
    public static Double number(JsonNode node, String key) {
        JsonNode value = node.get(key);
        return value != null && value.isNumber() && Double.isFinite(value.doubleValue()) && value.doubleValue() >= 0
                ? value.doubleValue() : null;
    }
    private static Integer integer(JsonNode node, String key) {
        var value = node.get(key);
        return value != null && value.isIntegralNumber() && value.canConvertToInt() && value.intValue() >= 0 ? value.intValue() : null;
    }
    private static Integer minutes(JsonNode node, String key) {
        Double value = number(node,key);
        return value == null || value / 60 > Integer.MAX_VALUE ? null : (int)Math.round(value / 60);
    }
    private static Double sumDistance(List<RouteLeg> legs) {
        if (legs.stream().anyMatch(l -> l.distanceMeters() == null)) return null;
        return legs.stream().mapToDouble(RouteLeg::distanceMeters).sum();
    }
    public static List<List<Double>> decodePolyline(String encoded) {
        if (encoded == null || encoded.isEmpty()) return List.of();
        List<List<Double>> points = new ArrayList<>();
        int[] cursor = {0}; long lat = 0, lon = 0;
        while (cursor[0] < encoded.length()) {
            lat += delta(encoded,cursor); lon += delta(encoded,cursor);
            double latitude = lat / 1e5, longitude = lon / 1e5;
            if (Math.abs(latitude)>90 || Math.abs(longitude)>180) throw new IllegalArgumentException("Invalid coordinate");
            points.add(List.of(latitude,longitude));
        }
        return List.copyOf(points);
    }
    private static long delta(String encoded,int[] cursor) {
        long result=0; int shift=0, b;
        do {
            if (cursor[0] >= encoded.length() || shift>30) throw new IllegalArgumentException("Invalid polyline");
            b=encoded.charAt(cursor[0]++)-63;
            if (b<0 || b>63) throw new IllegalArgumentException("Invalid polyline");
            result |= (long)(b&31)<<shift; shift+=5;
        } while (b>=32);
        return (result&1)!=0 ? ~(result>>1) : result>>1;
    }
}
