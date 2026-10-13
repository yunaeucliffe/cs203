package com.silverroute.repository;
import java.util.*;
import com.silverroute.model.RouteChoiceSnapshot;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
public interface RouteChoiceSnapshotRepository extends JpaRepository<RouteChoiceSnapshot,UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from RouteChoiceSnapshot s where s.id = :id and s.userId = :userId")
    Optional<RouteChoiceSnapshot> lockOwned(@Param("id") UUID id, @Param("userId") Long userId);
    // The owning preference row is locked by all choice writers before this query.
    List<RouteChoiceSnapshot> findByUserIdAndPreferenceRevisionAndLearningOrderGreaterThanOrderByLearningOrderAsc(
            Long userId, long preferenceRevision, long learningOrder);
}

