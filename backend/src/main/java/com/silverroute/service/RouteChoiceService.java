package com.silverroute.service;

import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.silverroute.agent.*;
import com.silverroute.api.RouteOption;
import com.silverroute.model.*;
import com.silverroute.repository.*;

@Service
public class RouteChoiceService {
    private final UserRepository users;
    private final UserPreferenceRepository preferences;
    private final RouteChoiceSnapshotRepository snapshots;
    private final PreferenceLearningGateway learning;
    private final ObjectMapper mapper = new ObjectMapper();
    public RouteChoiceService(UserRepository users, UserPreferenceRepository preferences, RouteChoiceSnapshotRepository snapshots, PreferenceLearningGateway learning) {
        this.users=users; this.preferences=preferences; this.snapshots=snapshots; this.learning=learning;
    }
    public record Metrics(String id, Double walking, Double sheltered, Integer walkingMinutes, Integer durationMinutes, Integer transfers) {
        static Metrics from(RouteOption route) {
            return new Metrics(route.id(),route.walkingDistanceMeters(),route.estimatedShelteredWalkingMeters(),
                    route.walkingMinutes(),route.durationMinutes(),route.transfers());
        }
        PreferenceLearningContext.RouteMetrics forModel() {
            Double distance=walking!=null && Double.isFinite(walking) && walking>=0 ? walking : null;
            Double share=distance!=null && distance>0 && sheltered!=null && Double.isFinite(sheltered)
                    && sheltered>=0 && sheltered<=distance ? sheltered/distance : null;
            return new PreferenceLearningContext.RouteMetrics(distance,share,
                    nonnegative(walkingMinutes),nonnegative(durationMinutes),nonnegative(transfers));
        }
        private static Integer nonnegative(Integer value) { return value!=null && value>=0 ? value : null; }
    }
    public record Receipt(String routeId, boolean preferencesUpdated, int minimizeWalkingPriority, int shelterPriority, String message, long choiceVersion) {}
    public record UndoReceipt(long choiceVersion, String message) {}
    private Long userId(String email) {
        return users.findByEmail(email).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND)).getId();
    }
    @Transactional(readOnly=true)
    public long revision(String email) {
        return preferences.findByUserId(userId(email)).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND)).getPreferenceRevision();
    }
    @Transactional
    public UUID remember(String email, AgentRecommendation result, long revision) {
        if (result.engine().startsWith("mock")) return null;
        Long userId=userId(email);
        List<Metrics> routes=new ArrayList<>();
        routes.add(Metrics.from(result.recommendedRoute()));
        result.alternatives().forEach(route -> routes.add(Metrics.from(route)));
        var snapshot=new RouteChoiceSnapshot(userId,revision,write(routes));
        return snapshots.save(snapshot).getId();
    }
    @Transactional
    public Receipt choose(String email, UUID id, String routeId, long expectedVersion) {
        Long owner=userId(email);
        var preference=preferences.lockByUserId(owner).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        var snapshot=snapshots.lockOwned(id,owner).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Recommendation not found"));
        if (snapshot.getSelectedRouteId()!=null) {
            if (snapshot.getChoiceVersion()!=expectedVersion+1 || !routeId.equals(snapshot.getSelectedRouteId())) throw new ResponseStatusException(HttpStatus.CONFLICT,"A route was already confirmed for this recommendation");
            return read(snapshot.getReceipt(),Receipt.class);
        }
        if (snapshot.getChoiceVersion()!=expectedVersion)
            throw new ResponseStatusException(HttpStatus.CONFLICT,"This choice has changed; search again to refresh it");
        if (!snapshot.getExpiresAt().isAfter(Instant.now())) throw new ResponseStatusException(HttpStatus.GONE,"Recommendation expired; search again");
        var routes=read(snapshot.getCandidates(),Metrics[].class);
        var selected=Arrays.stream(routes).filter(route -> route.id().equals(routeId)).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,"Route was not offered"));
        boolean eligible=preference.isAutomaticLearning() && preference.getPreferenceRevision()==snapshot.getPreferenceRevision();
        boolean updated=false;
        String message="Route chosen. Automatic preferences were not changed.";
        if (eligible && !selected.id().equals(routes[0].id())) {
            var context=new PreferenceLearningContext(preference.getMinimizeWalkingPriority(), preference.getShelterPriority(),
                    routes[0].forModel(),selected.forModel());
            try {
                var adjustment=learning.assess(context);
                if (adjustment==null) throw new IllegalArgumentException("No AI adjustment");
                adjustment.validate();
                if (adjustment.walkingDelta()!=0 && (context.recommended().walkingDistanceMeters()==null || context.chosen().walkingDistanceMeters()==null)
                        || adjustment.shelterDelta()!=0 && (context.recommended().shelteredWalkingShare()==null || context.chosen().shelteredWalkingShare()==null))
                    throw new IllegalArgumentException("Adjustment uses missing metrics");
                snapshot.recordAiLearning(preference.nextLearningSequence(),adjustment.walkingDelta(),adjustment.shelterDelta(),write(preference.learningState()));
                updated=preference.applyAdjustment(adjustment.walkingDelta(),adjustment.shelterDelta());
                message=(updated ? "Route chosen. AI updated your priorities: walking " + preference.getMinimizeWalkingPriority()
                        + ", shelter " + preference.getShelterPriority() + ". " : "Route chosen. AI left your priorities unchanged. ") + adjustment.reason();
            } catch (RuntimeException failure) {
                // A provider outage or invalid suggestion must not prevent choosing a route.
                message="Route chosen. AI preference learning is unavailable; your priorities were not changed.";
            }
        } else if (eligible) {
            message="Recommended route chosen. No alternative preference to learn from.";
        }
        var receipt=new Receipt(routeId,updated,preference.getMinimizeWalkingPriority(),preference.getShelterPriority(),message,snapshot.getChoiceVersion()+1);
        snapshot.confirm(routeId,write(receipt));
        return receipt;
    }
    @Transactional
    public UndoReceipt undo(String email, UUID id, long confirmedVersion) {
        Long owner=userId(email);
        // Lock in the same order as choose/manual updates to serialize replay and new choices.
        var preference=preferences.lockByUserId(owner).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        var snapshot=snapshots.lockOwned(id,owner).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Recommendation not found"));
        if (snapshot.getSelectedRouteId()==null && snapshot.getChoiceVersion()==confirmedVersion+1)
            return new UndoReceipt(snapshot.getChoiceVersion(),"Choice undone. Select a route and confirm again.");
        if (snapshot.getSelectedRouteId()==null || snapshot.getChoiceVersion()!=confirmedVersion)
            throw new ResponseStatusException(HttpStatus.CONFLICT,"This choice has changed; search again to refresh it");
        if (!snapshot.getExpiresAt().isAfter(Instant.now()))
            throw new ResponseStatusException(HttpStatus.GONE,"Recommendation expired; search again");
        if (snapshot.getChoiceVersion()==0)
            throw new ResponseStatusException(HttpStatus.CONFLICT,"This older choice cannot be undone safely; search again");
        if (snapshot.getLearningOrder()!=null && preference.getPreferenceRevision()==snapshot.getPreferenceRevision()) {
            preference.restoreLearning(read(snapshot.getLearningBefore(),UserPreference.LearningState.class));
            for (var later : snapshots.findByUserIdAndPreferenceRevisionAndLearningOrderGreaterThanOrderByLearningOrderAsc(
                    owner,snapshot.getPreferenceRevision(),snapshot.getLearningOrder())) {
                later.reviseLearningBefore(write(preference.learningState()));
                if (later.getLearningWalkingDelta()!=null && later.getLearningShelterDelta()!=null)
                    preference.applyAdjustment(later.getLearningWalkingDelta(),later.getLearningShelterDelta());
                else if (later.getLearningDirection()!=null)
                    preference.learnTradeoff(later.getLearningDirection());
            }
        }
        snapshot.undo();
        return new UndoReceipt(snapshot.getChoiceVersion(),"Choice undone. Select a route and confirm again.");
    }

    private String write(Object value) {
        try { return mapper.writeValueAsString(value); } catch(Exception e) { throw new IllegalStateException("Could not save route choice",e); }
    }
    private <T> T read(String value,Class<T> type) {
        try { return mapper.readValue(value,type); } catch(Exception e) { throw new IllegalStateException("Could not read route choice",e); }
    }
}
