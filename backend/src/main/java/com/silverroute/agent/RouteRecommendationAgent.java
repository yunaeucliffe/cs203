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
                profile.minimizeWalkingPriority(), profile.shelterPriority(),
                profile.walkingOnlyEnabled(), profile.walkingOnlyMaxDistanceMeters()));
        if (trip.routes().isEmpty()) throw new RouteDataUnavailableException("No routes were available for this trip");
        try {
            var transitIds = trip.routes().stream().filter(route -> !route.isWalkingOnly()).map(RouteOption::id).toList();
            var context = trip.context();
            var transitContext = new RouteContext(context.trip(), context.preferences(),
                    context.candidates().stream().filter(candidate -> transitIds.contains(candidate.id())).toList(),
                    context.dataWarnings(), context.selectionLimit());
            var ranking = transitIds.isEmpty() ? new RankingResult(List.of()) : model.rank(transitContext);
            return validateAndBuild(trip, ranking, model.engine());
        } catch (ModelAgentException | RouteDataUnavailableException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw new ModelAgentException("The model could not produce a valid recommendation", exception);
        }
    }

    public static AgentRecommendation validateAndBuild(AggregatedTrip trip, RankingResult result, String engine) {
        var walking = trip.routes().stream().filter(RouteOption::isWalkingOnly).findFirst().orElse(null);
        int expected = Math.min(walking == null ? 3 : 2, (int)trip.routes().stream().filter(route -> !route.isWalkingOnly()).count());
        if (result == null || result.rankings() == null || result.rankings().size() > expected || trip.routes().isEmpty())
            throw new ModelAgentException("The model returned an invalid number of routes");
        if (result.rankings().isEmpty() && walking == null)
            throw new RouteDataUnavailableException("MRT service disruptions affect every route for this trip right now. Try again later, or choose a different starting point or destination.");
        Map<String, RouteOption> candidates = new HashMap<>();
        trip.routes().forEach(route -> candidates.put(route.id(), route));
        Map<String, String> labels = new LinkedHashMap<>();
        for (var selection : result.rankings()) {
            if (selection == null || !candidates.containsKey(selection.routeId()) || candidates.get(selection.routeId()).isWalkingOnly() || labels.containsKey(selection.routeId())
                    || !validText(selection.warnings(), false))
                throw new ModelAgentException("The model returned invalid route selections or explanations");
            labels.put(selection.routeId(), "Route " + (labels.size() + 1));
        }
        List<RouteOption> ranked = new ArrayList<>();
        var ordered = new ArrayList<>(result.rankings().stream().map(selection -> candidates.get(selection.routeId())).toList());
        if (walking != null) ordered.add(walking);
        for (var selection : result.rankings()) {
            var weather = trip.context().candidates().stream().filter(c -> c.id().equals(selection.routeId()))
                    .findFirst().map(RouteContext.Candidate::weather).orElse(null);
            var reasons = RouteExplanationGenerator.explain(ordered, ranked.size(), trip.context().preferences(), weather);
            var routeWarnings = resolveReferences(selection.warnings(), selection.routeId(), labels, candidates.keySet());
            ranked.add(candidates.get(selection.routeId()).explain(reasons, routeWarnings));
        }
        if (walking != null) {
            var walkingId = walking.id();
            var weather = trip.context().candidates().stream().filter(c -> c.id().equals(walkingId))
                    .findFirst().map(RouteContext.Candidate::weather).orElse(null);
            var reasons = new ArrayList<String>();
            reasons.add("Walk all the way. Within your " + trip.context().preferences().walkingOnlyMaxDistanceMeters() + " m walking limit.");
            reasons.addAll(RouteExplanationGenerator.explain(ordered, ranked.size(), trip.context().preferences(), weather));
            ranked.add(walking.explain(reasons, List.of()));
        }
        Set<String> warnings = new LinkedHashSet<>(trip.context().dataWarnings());
        if (walking != null && result.rankings().isEmpty())
            warnings.add("No usable public transport route is available. You can choose to walk all the way.");
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
