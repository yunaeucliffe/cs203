package com.silverroute.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.silverroute.model.UserPreference;

public interface UserPreferenceRepository extends JpaRepository<UserPreference, Long> {
    Optional<UserPreference> findByUserId(Long userId);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from UserPreference p where p.userId = :userId")
    Optional<UserPreference> lockByUserId(@org.springframework.data.repository.query.Param("userId") Long userId);
}
