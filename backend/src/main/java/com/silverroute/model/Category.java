package com.silverroute.model;

import jakarta.persistence.*;

@Entity
@Table(name = "categories")
public class Category {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 7)
    private String color;

    protected Category() {}

    public Category(Long userId, String name, String color) {
        this.userId = userId;
        this.name = name.trim();
        this.color = color;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getColor() { return color; }
    public void update(String name, String color) {
        this.name = name.trim();
        this.color = color;
    }
}
