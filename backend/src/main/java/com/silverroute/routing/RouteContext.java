package com.silverroute.routing;

import java.util.List;
import com.silverroute.api.RouteOption;

/** Explicit allowlist for model input: no account identity, secrets, or geometry. */
public record RouteContext(Trip trip, SavedPreferences preferences, List<Candidate> candidates,
        List<String> dataWarnings) {
    public record Trip(String origin, String destination, String departureTime) {}
    public record Leg(String mode, String service, String fromId, String fromName,
            String toId, String toName, Double durationSeconds, Double distanceMeters,
            String startTime, String endTime) {}
    public record Candidate(String id, String summary, Integer durationMinutes, Integer walkingMinutes,
            Double walkingDistanceMeters, Integer transfers,
            Double estimatedShelteredWalkingMeters, List<Leg> legs, List<RouteEvidence> evidence, WeatherSummary weather) {
        public Candidate(String id, String summary, Integer durationMinutes, Integer walkingMinutes,
                Double walkingDistanceMeters, Integer transfers, Double estimatedShelteredWalkingMeters,
                List<Leg> legs, List<RouteEvidence> evidence) {
            this(id, summary, durationMinutes, walkingMinutes, walkingDistanceMeters, transfers,
                    estimatedShelteredWalkingMeters, legs, evidence, WeatherSummary.from(evidence,
                            walkingDistanceMeters, estimatedShelteredWalkingMeters, WeatherSummary.DEFAULT_HEAT_THRESHOLD));
        }
        public static Candidate from(RouteOption route) {
            return from(route, WeatherSummary.DEFAULT_HEAT_THRESHOLD);
        }

        public static Candidate from(RouteOption route, double heatThreshold) {
            return new Candidate(route.id(), route.summary(), route.durationMinutes(), route.walkingMinutes(),
                    route.walkingDistanceMeters(), route.transfers(),
                    route.estimatedShelteredWalkingMeters(), route.legs().stream().map(leg ->
                        new Leg(leg.mode(), leg.service(), leg.from().id(), leg.from().name(),
                            leg.to().id(), leg.to().name(), leg.durationSeconds(), leg.distanceMeters(),
                            leg.startTime(), leg.endTime())).toList(), route.evidence(), WeatherSummary.from(route.evidence(), route.walkingDistanceMeters(),
                                    route.estimatedShelteredWalkingMeters(), heatThreshold));
        }
    }
}
