package com.silverroute.repository;

import java.util.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import com.silverroute.model.TripShare;

public interface TripShareRepository extends JpaRepository<TripShare, UUID> {
    Optional<TripShare> findByToken(String token);
    List<TripShare> findByUserIdAndRevokedFalseAndExpiresAtAfter(Long userId, java.time.Instant now);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from TripShare s where s.id = :id and s.userId = :owner")
    Optional<TripShare> lockOwned(@Param("id") UUID id, @Param("owner") Long owner);
}
