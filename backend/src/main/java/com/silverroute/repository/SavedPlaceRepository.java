package com.silverroute.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.silverroute.model.SavedPlace;

public interface SavedPlaceRepository extends JpaRepository<SavedPlace, Long> {
    List<SavedPlace> findByUserIdOrderByCreatedAtAsc(Long userId);
    Optional<SavedPlace> findByIdAndUserId(Long id, Long userId);
    boolean existsByUserIdAndLabelIgnoreCase(Long userId, String label);
    boolean existsByUserIdAndLabelIgnoreCaseAndIdNot(Long userId, String label, Long id);
}
