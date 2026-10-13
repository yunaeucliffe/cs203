package com.silverroute.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "route_choice_snapshots")
public class RouteChoiceSnapshot {
    @Id private UUID id;
    @Column(nullable=false) private Long userId;
    @Column(nullable=false) private Instant expiresAt;
    @Column(nullable=false) private long preferenceRevision;
    @Column(nullable=false, columnDefinition="text") private String candidates;
    private String selectedRouteId;
    @Column(columnDefinition="text") private String receipt;
    @Column(nullable=false) private long choiceVersion;
    private Long learningOrder;
    private Integer learningDirection;
    @Column(columnDefinition="text") private String learningBefore;
    private Integer learningWalkingDelta;
    private Integer learningShelterDelta;
    public Integer getLearningWalkingDelta() { return learningWalkingDelta; }
    public Integer getLearningShelterDelta() { return learningShelterDelta; }
    public void recordAiLearning(long order, int walkingDelta, int shelterDelta, String before) {
        learningOrder=order; learningDirection=null; learningBefore=before;
        learningWalkingDelta=walkingDelta; learningShelterDelta=shelterDelta;
    }
    public long getChoiceVersion() { return choiceVersion; }
    public Long getLearningOrder() { return learningOrder; }
    public Integer getLearningDirection() { return learningDirection; }
    public String getLearningBefore() { return learningBefore; }
    public void recordLearning(long order, int direction, String before) {
        learningOrder=order; learningDirection=direction; learningBefore=before;
    }
    public void reviseLearningBefore(String before) { learningBefore=before; }
    public void undo() {
        selectedRouteId=null; receipt=null; learningOrder=null; learningDirection=null; learningBefore=null;
        learningWalkingDelta=null; learningShelterDelta=null;
        choiceVersion++;
    }
    protected RouteChoiceSnapshot() {}
    public RouteChoiceSnapshot(Long userId, long revision, String candidates) {
        this.id=UUID.randomUUID(); this.userId=userId; this.preferenceRevision=revision;
        this.candidates=candidates; this.expiresAt=Instant.now().plusSeconds(86400);
    }
    public UUID getId() { return id; }
    public Long getUserId() { return userId; }
    public Instant getExpiresAt() { return expiresAt; }
    public long getPreferenceRevision() { return preferenceRevision; }
    public String getCandidates() { return candidates; }
    public String getSelectedRouteId() { return selectedRouteId; }
    public String getReceipt() { return receipt; }
    public void confirm(String route, String receipt) { this.selectedRouteId=route; this.receipt=receipt; choiceVersion++; }
}
