package com.silverroute.service;

import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.server.ResponseStatusException;
import static org.assertj.core.api.Assertions.*;
import com.silverroute.model.*;
import com.silverroute.repository.*;
import com.silverroute.agent.*;
import static org.mockito.Mockito.*;
import com.silverroute.api.RouteOption;
import com.silverroute.dto.UpdatePreferencesRequest;

/** Uses the configured PostgreSQL database, like BackendApplicationTests. */
@SpringBootTest
@ActiveProfiles("mock")
class RouteChoicePersistenceTests {
    @org.springframework.test.context.bean.override.mockito.MockitoBean PreferenceLearningGateway learning;
    @Autowired RouteChoiceService choices;
    @Autowired ProfileService profiles;
    @Autowired UserRepository users;
    @Autowired UserPreferenceRepository preferences;
    String email; Long userId;
    @BeforeEach void setup() {
        when(learning.assess(any())).thenReturn(new PreferenceAdjustment(-3,5,"medium","More shelter despite extra walking."));
        String name="choice-"+UUID.randomUUID(); email=name+"@example.com";
        var user=users.save(new User("Choice test",name,email,"unused")); userId=user.getId();
        preferences.save(new UserPreference(userId,"Slow",80, 20));
    }
    @AfterEach void cleanup() { users.deleteById(userId); }
    private AgentRecommendation routes() {
        return new AgentRecommendation(route("best",500,100),List.of(route("alt",700,350)),List.of("Reason"),List.of(),List.of(),"test");
    }
    private RouteOption route(String id,double walking,double shelter) {
        return new RouteOption(id,id,20,5,0,"unknown",walking,2000.0,shelter,List.of(),List.of(),List.of(),List.of(),List.of());
    }
    private UUID offer() { return choices.remember(email,routes(),choices.revision(email)); }
    @Test void persistedLearningRoundTripsAndManualOverrideInvalidatesOldOffers() {
        choices.choose(email,offer(),"alt",0); choices.choose(email,offer(),"alt",0);
        UUID id=offer(); var receipt=choices.choose(email,id,"alt",0);
        assertThat(receipt.preferencesUpdated()).isTrue();
        assertThat(choices.choose(email,id,"alt",0)).isEqualTo(receipt);
        var profile=profiles.getProfileByEmail(email).orElseThrow();
        assertThat(profile.minimizeWalkingPriority()).isEqualTo(71);
        assertThat(profile.shelterPriority()).isEqualTo(35);
        assertThat(profile.walkingSpeed()).isEqualTo("Slow");
        UUID old=offer();
        profiles.updatePreferences(email,new UpdatePreferencesRequest("Slow",65,85,true));
        assertThat(choices.choose(email,old,"alt",0).message()).contains("not changed");
        assertThat(profiles.getProfileByEmail(email).orElseThrow().shelterPriority()).isEqualTo(85);
        profiles.updatePreferences(email,new UpdatePreferencesRequest("Slow",65,85,false));
        for(int i=0;i<3;i++) choices.choose(email,offer(),"alt",0);
        assertThat(profiles.getProfileByEmail(email).orElseThrow().shelterPriority()).isEqualTo(85);
    }
    @Test void concurrentReplayCountsOnceAndForeignUserCannotChoose() throws Exception {
        UUID id=offer();
        try(var executor=Executors.newFixedThreadPool(2)) {
            var gate=new CountDownLatch(1);
            Callable<RouteChoiceService.Receipt> task=() -> { gate.await(); return choices.choose(email,id,"alt",0); };
            var first=executor.submit(task); var second=executor.submit(task); gate.countDown();
            assertThat(first.get(10,TimeUnit.SECONDS)).isEqualTo(second.get(10,TimeUnit.SECONDS));
        }
        assertThat(choices.choose(email,offer(),"alt",0).preferencesUpdated()).isTrue();
        assertThat(choices.choose(email,offer(),"alt",0).preferencesUpdated()).isTrue();
        verify(learning,times(3)).assess(any());
        var other=users.save(new User("Other","other-"+UUID.randomUUID(),"other-"+UUID.randomUUID()+"@example.com","unused"));
        try {
            assertThatThrownBy(() -> choices.choose(other.getEmail(),id,"alt",0))
                    .isInstanceOfSatisfying(ResponseStatusException.class,e -> assertThat(e.getStatusCode().value()).isEqualTo(404));
        } finally { users.deleteById(other.getId()); }
    }
    @Test void mockRecommendationsAreExcluded() {
        var result=routes();
        assertThat(choices.remember(email,new AgentRecommendation(result.recommendedRoute(),result.alternatives(),List.of(),List.of(),List.of(),"mock-agent-v2"),0)).isNull();
    }

    @Test void undoRestoresScoresAndAllowsReselectionWithoutAnotherAiCall() {
        choices.choose(email,offer(),"alt",0); choices.choose(email,offer(),"alt",0);
        UUID third=offer(); var chosen=choices.choose(email,third,"alt",0);
        assertThat(chosen.preferencesUpdated()).isTrue();
        var undo=choices.undo(email,third,chosen.choiceVersion());
        assertThat(undo.choiceVersion()).isEqualTo(2);
        assertThat(profiles.getProfileByEmail(email).orElseThrow().minimizeWalkingPriority()).isEqualTo(74);
        var replacement=choices.choose(email,third,"best",undo.choiceVersion());
        assertThat(replacement.preferencesUpdated()).isFalse();
        assertThat(choices.choose(email,offer(),"alt",0).preferencesUpdated()).isTrue();
        assertThatThrownBy(() -> choices.undo(email,third,chosen.choiceVersion()))
                .isInstanceOfSatisfying(ResponseStatusException.class,e -> assertThat(e.getStatusCode().value()).isEqualTo(409));
        assertThat(profiles.getProfileByEmail(email).orElseThrow().minimizeWalkingPriority()).isEqualTo(71);
    }
    @Test void undoEarlierChoiceReplaysLaterChoicesAndUpdatesTheirUndoState() {
        UUID first=offer(), second=offer(), third=offer(), fourth=offer();
        for(UUID id:List.of(first,second,third,fourth)) choices.choose(email,id,"alt",0);
        clearInvocations(learning);
        choices.undo(email,first,1);
        verifyNoInteractions(learning);
        assertThat(profiles.getProfileByEmail(email).orElseThrow().minimizeWalkingPriority()).isEqualTo(71);
        choices.undo(email,third,1);
        assertThat(profiles.getProfileByEmail(email).orElseThrow().minimizeWalkingPriority()).isEqualTo(74);
        // Reconfirming is a new last event, not a duplicate of the undone event.
        assertThat(choices.choose(email,first,"alt",2).preferencesUpdated()).isTrue();
        assertThat(profiles.getProfileByEmail(email).orElseThrow().minimizeWalkingPriority()).isEqualTo(71);
    }
    @Test void undoPreservesManualOverridesAndNewerLearning() {
        UUID beforeEdit=offer(); choices.choose(email,beforeEdit,"alt",0);
        profiles.updatePreferences(email,new UpdatePreferencesRequest("Normal",60,40,true));
        for(int i=0;i<3;i++) choices.choose(email,offer(),"alt",0);
        choices.undo(email,beforeEdit,1);
        var profile=profiles.getProfileByEmail(email).orElseThrow();
        assertThat(profile.minimizeWalkingPriority()).isEqualTo(51);
        assertThat(profile.shelterPriority()).isEqualTo(55);
        assertThat(profile.walkingSpeed()).isEqualTo("Normal");
    }
    @Test void concurrentUndoIsIdempotentAndOldConfirmCannotReappear() throws Exception {
        UUID id=offer(); choices.choose(email,id,"alt",0);
        try(var executor=Executors.newFixedThreadPool(2)) {
            var gate=new CountDownLatch(1);
            Callable<RouteChoiceService.UndoReceipt> task=() -> { gate.await(); return choices.undo(email,id,1); };
            var first=executor.submit(task); var second=executor.submit(task); gate.countDown();
            assertThat(first.get(10,TimeUnit.SECONDS)).isEqualTo(second.get(10,TimeUnit.SECONDS));
        }
        assertThatThrownBy(() -> choices.choose(email,id,"alt",0)).isInstanceOf(ResponseStatusException.class);
        choices.choose(email,id,"alt",2);
        assertThat(choices.choose(email,offer(),"alt",0).preferencesUpdated()).isTrue();
        assertThat(choices.choose(email,offer(),"alt",0).preferencesUpdated()).isTrue();
    }
    @Test void undoClampedScoresRestoresExactValues() {
        when(learning.assess(any())).thenReturn(new PreferenceAdjustment(-8,7,"high","Clear trade-off."));
        profiles.updatePreferences(email,new UpdatePreferencesRequest("Slow",5,95,true));
        UUID id=offer(); choices.choose(email,id,"alt",0);
        assertThat(profiles.getProfileByEmail(email).orElseThrow().minimizeWalkingPriority()).isZero();
        choices.undo(email,id,1);
        assertThat(profiles.getProfileByEmail(email).orElseThrow().minimizeWalkingPriority()).isEqualTo(5);
        assertThat(profiles.getProfileByEmail(email).orElseThrow().shelterPriority()).isEqualTo(95);
    }
}
