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
    // Waits for any in-flight location update's row lock, then clears the stored location.
    @Modifying
    @Query("update TripShare s set s.revoked = true, s.latitude = null, s.longitude = null, s.locationUpdatedAt = null "
            + "where s.userId = :owner and s.revoked = false")
    int revokeAllOwned(@Param("owner") Long owner);
    // Spring Session JDBC's table (migration 004), read and deleted inside trip-sharing transactions so that
    // sign-out (revoke + end session) is all or nothing and visible to other in-flight requests.
    @Query(value = "select exists(select 1 from spring_session where session_id = :id)", nativeQuery = true)
    boolean sessionExists(@Param("id") String sessionId);
    @Modifying
    @Query(value = "delete from spring_session where session_id = :id", nativeQuery = true)
    int deleteSession(@Param("id") String sessionId);
    @Modifying
    @Query("delete from TripShare s where s.expiresAt < :now")
    int deleteExpired(@Param("now") java.time.Instant now);
}
