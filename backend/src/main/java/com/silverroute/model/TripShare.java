package com.silverroute.model;

import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.*;

@Entity
@Table(name = "trip_shares")
public class TripShare {
    @Id public UUID id = UUID.randomUUID();
    @Column(nullable = false, unique = true, length = 64) public String token;
    @Column(nullable = false) public Long userId;
    @Column(nullable = false, length = 500) public String origin;
    @Column(nullable = false, length = 500) public String destination;
    @Column(nullable = false, length = 2000) public String routeSummary;
    @Column(nullable = false) public Instant estimatedArrival;
    @Column(nullable = false) public Instant expiresAt;
    @Column(nullable = false) public boolean liveLocation;
    @Column(nullable = false) public boolean revoked;
    @Column(nullable = false) public boolean arrived;
    public Double latitude;
    public Double longitude;
    public Instant locationUpdatedAt;
    public TripShare() {}
}
