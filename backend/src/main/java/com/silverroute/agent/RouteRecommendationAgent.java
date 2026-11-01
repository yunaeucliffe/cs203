package com.silverroute.agent;

import java.util.*;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import com.silverroute.api.*;
import com.silverroute.exception.*;
import com.silverroute.routing.*;
import com.silverroute.service.ProfileService;
import com.silverroute.service.RouteDataAggregatorService;

@Service
public class RouteRecommendationAgent {
    private static final Pattern ROUTE_REFERENCE = Pattern.compile("\\{\\{route:([^{}\\s]+)}}");
    private static final Pattern MANUAL_ROUTE_NUMBER = Pattern.compile(
            "(?i)\\b(?:routes?\\s*(?:number\\s*|no\\.?\\s*|#\\s*|[-:]\\s*)?(?:\\d+|one|two|three|first|second|third)\\b"
            + "|(?:first|second|third|1st|2nd|3rd)\\s+route\\b)");
    private final ModelGateway model;
    private final RouteDataAggregatorService aggregator;
    private final ProfileService profiles;

    public RouteRecommendationAgent(ModelGateway model, RouteDataAggregatorService aggregator, ProfileService profiles) {
        this.model = model;
        this.aggregator = aggregator;
        this.profiles = profiles;
    }

    public AgentRecommendation recommend(TripRequest request, String authenticatedEmail) {
        var profile = profiles.getProfileByEmail(authenticatedEmail).orElseThrow(() ->
                new RouteDataUnavailableException("Saved travel preferences are unavailable"));
        var trip = aggregator.aggregate(request, new SavedPreferences(profile.walkingSpeed(),
                profile.minimizeWalkingPriority(), profile.shelterPriority()));
        if (trip.routes().isEmpty()) throw new RouteDataUnavailableException("No routes were available for this trip");
        try {
            return validateAndBuild(trip, model.rank(trip.context()), model.engine());
        } catch (ModelAgentException | RouteDataUnavailableException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw new ModelAgentException("The model could not produce a valid recommendation", exception);
        }
    }

    public static AgentRecommendation validateAndBuild(AggregatedTrip trip, RankingResult result, String engine) {
        int expected = Math.min(3, trip.routes().size());
        if (result == null || result.rankings() == null || result.rankings().size() > expected || expected == 0)
            throw new ModelAgentException("The model returned an invalid number of routes");
        if (result.rankings().isEmpty())
            throw new RouteDataUnavailableException("Train service disruptions affect every route for this trip right now. Try again later, or choose a different starting point or destination.");
        Map<String, RouteOption> candidates = new HashMap<>();
        trip.routes().forEach(route -> candidates.put(route.id(), route));
        Map<String, String> labels = new LinkedHashMap<>();
        for (var selection : result.rankings()) {
            if (selection == null || !candidates.containsKey(selection.routeId()) || labels.containsKey(selection.routeId())
                    || !validText(selection.warnings(), false))
                throw new ModelAgentException("The model returned invalid route selections or explanations");
            labels.put(selection.routeId(), "Route " + (labels.size() + 1));
        }
        List<RouteOption> ranked = new ArrayList<>();
        var ordered = result.rankings().stream().map(selection -> candidates.get(selection.routeId())).toList();
        for (var selection : result.rankings()) {
            var reasons = RouteExplanationGenerator.explain(ordered, ranked.size(), trip.context().preferences());
            var routeWarnings = resolveReferences(selection.warnings(), selection.routeId(), labels, candidates.keySet());
            ranked.add(candidates.get(selection.routeId()).explain(reasons, routeWarnings));
        }
        Set<String> warnings = new LinkedHashSet<>(trip.context().dataWarnings());
        ranked.forEach(route -> warnings.addAll(route.warnings()));
        return new AgentRecommendation(ranked.getFirst(), List.copyOf(ranked.subList(1, ranked.size())),
                ranked.getFirst().reasons(), List.copyOf(warnings), trip.sources(), engine);
    }

    private static List<String> resolveReferences(List<String> texts, String currentId,
            Map<String, String> labels, Set<String> candidateIds) {
        return texts.stream().map(text -> {
            var matcher = ROUTE_REFERENCE.matcher(text);
            StringBuilder rendered = new StringBuilder();
            int end = 0;
            while (matcher.find()) {
                validateLiteral(text.substring(end, matcher.start()), candidateIds);
                String target = matcher.group(1);
                if (!labels.containsKey(target) || currentId.equals(target))
                    throw new ModelAgentException("The model returned an invalid route reference");
                rendered.append(text, end, matcher.start()).append(labels.get(target));
                end = matcher.end();
            }
            validateLiteral(text.substring(end), candidateIds);
            return rendered.append(text.substring(end)).toString();
        }).toList();
    }

    private static void validateLiteral(String text, Set<String> candidateIds) {
        if (text.contains("{") || text.contains("}") || MANUAL_ROUTE_NUMBER.matcher(text).find()
                || candidateIds.stream().anyMatch(id -> Pattern.compile(
                        "(?<![\\w-])" + Pattern.quote(id) + "(?![\\w-])").matcher(text).find())
                || text.matches("(?s).*\\bonemap-route-[\\w-]+.*"))
            throw new ModelAgentException("The model returned an invalid route reference");
    }

    private static boolean validText(List<String> text, boolean required) {
        return text != null && (!required || !text.isEmpty()) && text.size() <= 8
                && text.stream().allMatch(value -> value != null && !value.isBlank() && value.length() <= 1000);
    }
}
