package com.silverroute.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.silverroute.model.UserPreference;

public interface UserPreferenceRepository extends JpaRepository<UserPreference, Long> {
    Optional<UserPreference> findByUserId(Long userId);
}
