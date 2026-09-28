package com.silverroute.routing;

import java.util.Map;

/** observedAt is provider time, retrievedAt is fetch time; unknown is never a clean bill of health. */
public record RouteEvidence(String source, String observedAt, String retrievedAt,
        String availability, Map<String, Object> details) {}
