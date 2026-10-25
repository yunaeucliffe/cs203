package com.silverroute.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import com.silverroute.model.*;
import com.silverroute.repository.*;

@ExtendWith(MockitoExtension.class)
class TripShareServiceTests {
    @Mock TripShareRepository shares;
    @Mock UserRepository users;
    TripShareService service;
    TripShare share;
    @BeforeEach void setup() {
        service = new TripShareService(shares, users);
        share = new TripShare();
        share.token = "secret";
        share.userId = 1L;
        share.expiresAt = Instant.now().plusSeconds(600);
        share.liveLocation = true;
    }
    void owner() {
        var user = new User("Owner", "owner", "owner@example.com", "unused");
        ReflectionTestUtils.setField(user, "id", 1L);
        when(users.findByEmail("owner@example.com")).thenReturn(Optional.of(user));
    }
    @Test void createsUnpredictableExpiringDetailsOnlyLink() {
        owner();
        when(shares.save(any())).thenAnswer(call -> call.getArgument(0));
        var request = new TripShareService.Create("Home", "Clinic", "Bus 10", Instant.now().plusSeconds(900), false);
        var first = service.create("owner@example.com", request);
        var second = service.create("owner@example.com", request);
        assertThat(first.token()).hasSize(43).isNotEqualTo(second.token());
        assertThat(first.liveLocation()).isFalse();
        assertThat(first.latitude()).isNull();
        assertThat(first.expiresAt()).isBetween(Instant.now().plusSeconds(86390), Instant.now().plusSeconds(86410));
    }
    @Test void validLinkCanBeReadWithoutOwnerLookup() {
        when(shares.findByToken("secret")).thenReturn(Optional.of(share));
        assertThat(service.read("secret").expiresAt()).isEqualTo(share.expiresAt);
        verifyNoInteractions(users);
    }
    @Test void missingExpiredAndRevokedLinksAllDenyAccess() {
        when(shares.findByToken("missing")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.read("missing")).isInstanceOf(ResponseStatusException.class);
        when(shares.findByToken("secret")).thenReturn(Optional.of(share));
        share.expiresAt = Instant.now().minusSeconds(1);
        assertThatThrownBy(() -> service.read("secret")).hasMessageContaining("invalid or has ended");
        share.expiresAt = Instant.now().plusSeconds(100);
        share.revoked = true;
        assertThatThrownBy(() -> service.read("secret")).hasMessageContaining("invalid or has ended");
    }
    @Test void otherOwnerCannotUpdateOrStop() {
        owner();
        when(shares.lockOwned(share.id, 1L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.update("owner@example.com", share.id,
                new TripShareService.Location(1.3, 103.8))).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> service.stop("owner@example.com", share.id, false)).isInstanceOf(ResponseStatusException.class);
        assertThat(share.revoked).isFalse();
        assertThat(share.latitude).isNull();
    }
    @Test void ownerCanUpdateThenRevokeAndCannotUpdateAgain() {
        owner();
        when(shares.lockOwned(share.id, 1L)).thenReturn(Optional.of(share));
        when(shares.findByToken("secret")).thenReturn(Optional.of(share));
        var before = Instant.now();
        service.update("owner@example.com", share.id, new TripShareService.Location(1.3, 103.8));
        assertThat(share.latitude).isEqualTo(1.3);
        assertThat(share.locationUpdatedAt).isBetween(before, Instant.now());
        service.stop("owner@example.com", share.id, false);
        assertThat(share.latitude).isNull();
        assertThatThrownBy(() -> service.read("secret")).hasMessageContaining("invalid or has ended");
        assertThatThrownBy(() -> service.update("owner@example.com", share.id,
                new TripShareService.Location(1.4, 103.9))).isInstanceOf(ResponseStatusException.class);
    }
    @Test void arrivalEndsSharingWithArrivedMessageOnly() {
        owner();
        when(shares.lockOwned(share.id, 1L)).thenReturn(Optional.of(share));
        when(shares.findByToken("secret")).thenReturn(Optional.of(share));
        service.stop("owner@example.com", share.id, true);
        assertThat(share.revoked).isTrue();
        assertThatThrownBy(() -> service.read("secret"))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        ex -> assertThat(ex.getStatusCode().value()).isEqualTo(410))
                .hasMessageContaining("They have arrived");
    }
    @Test void expiredArrivedLinkRevealsNothing() {
        when(shares.findByToken("secret")).thenReturn(Optional.of(share));
        share.revoked = true;
        share.arrived = true;
        share.expiresAt = Instant.now().minusSeconds(1);
        assertThatThrownBy(() -> service.read("secret")).hasMessageContaining("invalid or has ended");
    }
    @Test void stopAfterArrivalKeepsArrivedMessage() {
        owner();
        when(shares.lockOwned(share.id, 1L)).thenReturn(Optional.of(share));
        service.stop("owner@example.com", share.id, true);
        service.stop("owner@example.com", share.id, false);
        assertThat(share.arrived).isTrue();
    }
    @Test void expiredSharesAreDeleted() {
        var before = Instant.now();
        service.deleteExpired();
        verify(shares).deleteExpired(argThat(now -> !now.isBefore(before)));
    }
    @Test void disabledAndExpiredLocationUpdatesAreRejected() {
        owner();
        when(shares.lockOwned(share.id, 1L)).thenReturn(Optional.of(share));
        share.liveLocation = false;
        assertThatThrownBy(() -> service.update("owner@example.com", share.id,
                new TripShareService.Location(1.3, 103.8))).hasMessageContaining("disabled");
        share.liveLocation = true;
        share.expiresAt = Instant.now().minusSeconds(1);
        assertThatThrownBy(() -> service.update("owner@example.com", share.id,
                new TripShareService.Location(1.3, 103.8))).isInstanceOf(ResponseStatusException.class);
    }
}
