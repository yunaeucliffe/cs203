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

    @Column(name = "walking_tolerance", nullable = false, length = 20)
    private String walkingTolerance;

    @Column(name = "prefer_sheltered", nullable = false)
    private boolean preferSheltered;

    protected UserPreference() {
    }

    public UserPreference(Long userId, String walkingSpeed, String walkingTolerance,
            boolean preferSheltered) {
        this.userId = userId;
        this.walkingSpeed = walkingSpeed;
        this.walkingTolerance = walkingTolerance;
        this.preferSheltered = preferSheltered;
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

    public String getWalkingTolerance() {
        return walkingTolerance;
    }

    public boolean isPreferSheltered() {
        return preferSheltered;
    }

    public void update(String walkingSpeed, String walkingTolerance, boolean preferSheltered) {
        this.walkingSpeed = walkingSpeed;
        this.walkingTolerance = walkingTolerance;
        this.preferSheltered = preferSheltered;
    }

}
