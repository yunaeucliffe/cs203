package com.silverroute.service;

import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import com.silverroute.agent.*;
import com.silverroute.model.*;
import com.silverroute.repository.*;

class RouteChoiceServiceTests {
    final UserRepository users=mock(UserRepository.class);
    final UserPreferenceRepository preferences=mock(UserPreferenceRepository.class);
    final RouteChoiceSnapshotRepository snapshots=mock(RouteChoiceSnapshotRepository.class);
    final PreferenceLearningGateway learning=mock(PreferenceLearningGateway.class);
    final RouteChoiceService service=new RouteChoiceService(users,preferences,snapshots,learning);
    final UserPreference preference=new UserPreference(1L,"Normal",50,20);
    final RouteChoiceSnapshot snapshot=new RouteChoiceSnapshot(1L,0,"[{\"id\":\"best\",\"walking\":500,\"sheltered\":100,\"durationMinutes\":20,\"transfers\":0},{\"id\":\"alt\",\"walking\":700,\"sheltered\":350,\"durationMinutes\":18,\"transfers\":1}]");
    @BeforeEach void setup() {
        var user=new User("Test","test","a@example.com","unused"); ReflectionTestUtils.setField(user,"id",1L);
        when(users.findByEmail("a@example.com")).thenReturn(Optional.of(user));
        when(snapshots.lockOwned(snapshot.getId(),1L)).thenReturn(Optional.of(snapshot));
        when(preferences.lockByUserId(1L)).thenReturn(Optional.of(preference));
        when(learning.assess(any())).thenReturn(new PreferenceAdjustment(-3,5,"medium","More shelter may explain the extra walking."));
    }
    @Test void aiDecidesIndependentDeltasImmediatelyAndDuplicateDoesNotCallAgain() {
        var first=service.choose("a@example.com",snapshot.getId(),"alt",0);
        assertThat(first.preferencesUpdated()).isTrue();
        assertThat(first.minimizeWalkingPriority()).isEqualTo(47);
        assertThat(first.shelterPriority()).isEqualTo(25);
        assertThat(service.choose("a@example.com",snapshot.getId(),"alt",0)).isEqualTo(first);
        var context=org.mockito.ArgumentCaptor.forClass(PreferenceLearningContext.class);
        verify(learning,times(1)).assess(context.capture());
        assertThat(context.getValue().chosen().shelteredWalkingShare()).isEqualTo(0.5);
        assertThat(context.getValue().chosen().durationMinutes()).isEqualTo(18);
        assertThat(context.getValue().chosen().transfers()).isEqualTo(1);
        assertThatThrownBy(() -> service.choose("a@example.com",snapshot.getId(),"best",0)).isInstanceOf(ResponseStatusException.class);
    }
    @Test void zeroChangeIsValidAndNotReportedAsFailure() {
        when(learning.assess(any())).thenReturn(new PreferenceAdjustment(0,0,"low","A faster journey could explain the choice."));
        var receipt=service.choose("a@example.com",snapshot.getId(),"alt",0);
        assertThat(receipt.preferencesUpdated()).isFalse();
        assertThat(receipt.message()).contains("AI left").doesNotContain("unavailable");
    }
    @Test void providerFailureStillSavesRouteAndRetriesDoNotChargeAgain() {
        when(learning.assess(any())).thenThrow(new IllegalStateException("secret diagnostics"));
        var receipt=service.choose("a@example.com",snapshot.getId(),"alt",0);
        assertThat(receipt.message()).contains("unavailable").doesNotContain("secret");
        assertThat(receipt.minimizeWalkingPriority()).isEqualTo(50);
        assertThat(snapshot.getSelectedRouteId()).isEqualTo("alt");
        assertThat(service.choose("a@example.com",snapshot.getId(),"alt",0)).isEqualTo(receipt);
        verify(learning,times(1)).assess(any());
    }
    @Test void outOfRangeOrUnsupportedSuggestionDoesNotChangeScores() {
        when(learning.assess(any())).thenReturn(new PreferenceAdjustment(-100,5,"medium","Too large"));
        assertThat(service.choose("a@example.com",snapshot.getId(),"alt",0).preferencesUpdated()).isFalse();
        assertThat(preference.getMinimizeWalkingPriority()).isEqualTo(50);
        assertThat(snapshot.getLearningOrder()).isNull();
    }
    @Test void missingShelterCannotProduceShelterAdjustment() {
        ReflectionTestUtils.setField(snapshot,"candidates","[{\"id\":\"best\",\"walking\":500},{\"id\":\"alt\",\"walking\":700}]");
        assertThat(service.choose("a@example.com",snapshot.getId(),"alt",0).preferencesUpdated()).isFalse();
        assertThat(preference.getShelterPriority()).isEqualTo(20);
    }
    @Test void optingOutManualEditsAndRecommendedChoiceSkipAi() {
        preference.resetLearning(false);
        service.choose("a@example.com",snapshot.getId(),"alt",0);
        verifyNoInteractions(learning);
    }
    @Test void manualEditInvalidatesEarlierOffers() {
        preference.resetLearning(true);
        service.choose("a@example.com",snapshot.getId(),"alt",0);
        verifyNoInteractions(learning);
    }
    @Test void recommendedRouteDoesNotCallAi() {
        service.choose("a@example.com",snapshot.getId(),"best",0);
        verifyNoInteractions(learning);
    }
    @Test void unknownExpiredAndUnofferedRoutesAreRejectedBeforeAi() {
        assertThatThrownBy(() -> service.choose("a@example.com",UUID.randomUUID(),"alt",0)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> service.choose("a@example.com",snapshot.getId(),"invented",0)).isInstanceOf(ResponseStatusException.class);
        ReflectionTestUtils.setField(snapshot,"expiresAt",Instant.now().minusSeconds(1));
        assertThatThrownBy(() -> service.choose("a@example.com",snapshot.getId(),"alt",0)).isInstanceOf(ResponseStatusException.class);
        verifyNoInteractions(learning);
    }
    @Test void undoRejectsExpiredAndUnconfirmedOffers() {
        assertThatThrownBy(() -> service.undo("a@example.com",snapshot.getId(),1)).isInstanceOf(ResponseStatusException.class);
        service.choose("a@example.com",snapshot.getId(),"alt",0);
        ReflectionTestUtils.setField(snapshot,"expiresAt",Instant.now().minusSeconds(1));
        assertThatThrownBy(() -> service.undo("a@example.com",snapshot.getId(),1)).isInstanceOf(ResponseStatusException.class);
    }
}
