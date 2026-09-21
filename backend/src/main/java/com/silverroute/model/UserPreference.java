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

    @Column(name = "walking_speed", nullable = false)
    private String walkingSpeed;

    @Column(name = "max_walking_distance", nullable = false)
    private Integer maxWalkingDistance;

    @Column(name = "avoid_stairs", nullable = false)
    private boolean avoidStairs;

    protected UserPreference() {
    }

    public UserPreference(Long userId, String walkingSpeed, Integer maxWalkingDistance,
            boolean avoidStairs) {
        this.userId = userId;
        this.walkingSpeed = walkingSpeed;
        this.maxWalkingDistance = maxWalkingDistance;
        this.avoidStairs = avoidStairs;
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

    public Integer getMaxWalkingDistance() {
        return maxWalkingDistance;
    }

    public boolean isAvoidStairs() {
        return avoidStairs;
    }

    public void update(String walkingSpeed, Integer maxWalkingDistance, boolean avoidStairs) {
        this.walkingSpeed = walkingSpeed;
        this.maxWalkingDistance = maxWalkingDistance;
        this.avoidStairs = avoidStairs;
    }

}
