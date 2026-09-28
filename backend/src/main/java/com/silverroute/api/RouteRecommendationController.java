package com.silverroute.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.silverroute.agent.AgentRecommendation;
import com.silverroute.agent.RouteRecommendationAgent;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/route-recommendations")
public class RouteRecommendationController {

    private final RouteRecommendationAgent agent;

    public RouteRecommendationController(RouteRecommendationAgent agent) {
        this.agent = agent;
    }

    @PostMapping
    public ResponseEntity<RouteRecommendationResponse> recommend(
            @Valid @RequestBody TripRequest tripRequest,
            HttpServletRequest httpRequest,
            org.springframework.security.core.Authentication authentication) {
        String requestId = RequestIdFilter.from(httpRequest);
        AgentRecommendation recommendation = agent.recommend(tripRequest, authentication.getName());

        return ResponseEntity.ok(new RouteRecommendationResponse(
                requestId,
                recommendation.recommendedRoute(),
                recommendation.alternatives(),
                recommendation.reasons(),
                recommendation.warnings(),
                recommendation.sources(),
                recommendation.engine()));
    }
}
