package com.silverroute.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_preferences")
public class UserPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "walking_speed", nullable = false, length = 20)
    private String walkingSpeed;

    @Column(name = "minimize_walking_priority", nullable = false)
    private int minimizeWalkingPriority;

    @Column(name = "shelter_priority", nullable = false)
    private int shelterPriority;

    public int getMinimizeWalkingPriority() { return minimizeWalkingPriority; }
    public int getShelterPriority() { return shelterPriority; }

    public void updatePriorities(int walking, int shelter) {
        if (walking < 0 || walking > 100 || shelter < 0 || shelter > 100)
            throw new IllegalArgumentException("Priorities must be between 0 and 100");
        this.minimizeWalkingPriority = walking;
        this.shelterPriority = shelter;
    }

    @Column(name = "automatic_learning", nullable = false)
    private boolean automaticLearning = true;
    @Column(name = "tradeoff_streak", nullable = false)
    private int tradeoffStreak;
    @Column(name = "preference_revision", nullable = false)
    private long preferenceRevision;
    @Column(name = "learning_sequence", nullable = false)
    private long learningSequence;
    public long nextLearningSequence() { return ++learningSequence; }
    public record LearningState(int walking, int shelter, int streak) {}
    public LearningState learningState() {
        return new LearningState(minimizeWalkingPriority, shelterPriority, tradeoffStreak);
    }
    public void restoreLearning(LearningState state) {
        updatePriorities(state.walking(), state.shelter());
        tradeoffStreak = state.streak();
    }
    public boolean isAutomaticLearning() { return automaticLearning; }
    public long getPreferenceRevision() { return preferenceRevision; }
    public void resetLearning(Boolean enabled) {
        if (enabled != null) automaticLearning = enabled;
        tradeoffStreak = 0;
        preferenceRevision++;
    }
    public boolean applyAdjustment(int walkingDelta, int shelterDelta) {
        int walking = Math.clamp(minimizeWalkingPriority + walkingDelta, 0, 100);
        int shelter = Math.clamp(shelterPriority + shelterDelta, 0, 100);
        boolean changed = walking != minimizeWalkingPriority || shelter != shelterPriority;
        updatePriorities(walking, shelter);
        return changed;
    }
    /** Only replays pre-AI history during undo; new choices use applyAdjustment. */
    public boolean learnTradeoff(int direction) {
        if (!automaticLearning || direction == 0) return false;
        tradeoffStreak = Integer.signum(tradeoffStreak) == direction ? tradeoffStreak + direction : direction;
        if (Math.abs(tradeoffStreak) < 3) return false;
        int walking = Math.clamp(minimizeWalkingPriority - 10 * direction, 0, 100);
        int shelter = Math.clamp(shelterPriority + 10 * direction, 0, 100);
        boolean changed = walking != minimizeWalkingPriority || shelter != shelterPriority;
        updatePriorities(walking, shelter);
        tradeoffStreak = 0;
        return changed;
    }

    protected UserPreference() {
    }

    public UserPreference(Long userId, String walkingSpeed, int minimizeWalkingPriority, int shelterPriority) {
        this.userId = userId;
        this.walkingSpeed = walkingSpeed;
        updatePriorities(minimizeWalkingPriority, shelterPriority);
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getWalkingSpeed() {
        return walkingSpeed;
    }

    public void updateWalkingSpeed(String walkingSpeed) {
        this.walkingSpeed = walkingSpeed;
    }
}
