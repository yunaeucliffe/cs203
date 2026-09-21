package com.silverroute.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "saved_places")
public class SavedPlace {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 100)
    private String label;

    @Column(nullable = false, length = 500)
    private String address;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected SavedPlace() {
    }

    public SavedPlace(Long userId, String label, String address,
            BigDecimal latitude, BigDecimal longitude) {
        this.userId = userId;
        this.createdAt = LocalDateTime.now();
        update(label, address, latitude, longitude);
    }

    public void update(String label, String address, BigDecimal latitude, BigDecimal longitude) {
        this.label = label.trim();
        this.address = address.trim();
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public String getLabel() { return label; }
    public String getAddress() { return address; }
    public BigDecimal getLatitude() { return latitude; }
    public BigDecimal getLongitude() { return longitude; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
