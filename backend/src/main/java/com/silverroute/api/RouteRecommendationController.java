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

    private final com.silverroute.service.RouteChoiceService choices;

    public RouteRecommendationController(RouteRecommendationAgent agent, com.silverroute.service.RouteChoiceService choices) {
        this.choices = choices;
        this.agent = agent;
    }

    public record ChoiceRequest(@jakarta.validation.constraints.NotBlank String routeId,
            @jakarta.validation.constraints.NotNull @jakarta.validation.constraints.Min(0) Long choiceVersion) {}

    @PostMapping("/{id}/choice")
    public com.silverroute.service.RouteChoiceService.Receipt choose(
            @org.springframework.web.bind.annotation.PathVariable java.util.UUID id,
            @Valid @RequestBody ChoiceRequest request,
            org.springframework.security.core.Authentication authentication) {
        return choices.choose(authentication.getName(), id, request.routeId(), request.choiceVersion());
    }

    public record UndoRequest(@jakarta.validation.constraints.NotNull @jakarta.validation.constraints.Min(1) Long choiceVersion) {}

    @PostMapping("/{id}/choice/undo")
    public com.silverroute.service.RouteChoiceService.UndoReceipt undo(
            @org.springframework.web.bind.annotation.PathVariable java.util.UUID id,
            @Valid @RequestBody UndoRequest request,
            org.springframework.security.core.Authentication authentication) {
        return choices.undo(authentication.getName(), id, request.choiceVersion());
    }

    @PostMapping
    public ResponseEntity<RouteRecommendationResponse> recommend(
            @Valid @RequestBody TripRequest tripRequest,
            HttpServletRequest httpRequest,
            org.springframework.security.core.Authentication authentication) {
        String requestId = RequestIdFilter.from(httpRequest);
        long revision = choices.revision(authentication.getName());
        AgentRecommendation recommendation = agent.recommend(tripRequest, authentication.getName());

        return ResponseEntity.ok(new RouteRecommendationResponse(
                requestId,
                recommendation.recommendedRoute(),
                recommendation.alternatives(),
                recommendation.reasons(),
                recommendation.warnings(),
                recommendation.sources(),
                recommendation.engine(), choices.remember(authentication.getName(), recommendation, revision)));
    }
}
