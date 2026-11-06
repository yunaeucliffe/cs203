package com.silverroute.service;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import com.silverroute.agent.PreferenceAdjustment;
import com.silverroute.model.UserPreference;

class PreferenceLearningTests {
    @Test void scoresClampAndLearningDoesNotChangeSpeed() {
        var p=new UserPreference(1L,"Slow",5,95);
        assertThat(p.applyAdjustment(-8,7)).isTrue();
        assertThat(p.getMinimizeWalkingPriority()).isZero();
        assertThat(p.getShelterPriority()).isEqualTo(100);
        assertThat(p.getWalkingSpeed()).isEqualTo("Slow");
        assertThat(p.applyAdjustment(-8,7)).isFalse();
    }
    @Test void independentlyBoundedDeltasAndLowConfidenceValidation() {
        new PreferenceAdjustment(-3,5,"medium","Evidence").validate();
        new PreferenceAdjustment(0,0,"low","Uncertain").validate();
        for(var invalid:java.util.List.of(
                new PreferenceAdjustment(-11,5,"high","Evidence"),
                new PreferenceAdjustment(1,0,"low","Uncertain"),
                new PreferenceAdjustment(0,0,"other","Evidence"),
                new PreferenceAdjustment(0,0,"high","")))
            assertThatThrownBy(invalid::validate).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void requestValidationRejectsOutOfRangeScoresAndInvalidSpeed() {
        try(var factory=jakarta.validation.Validation.buildDefaultValidatorFactory()) {
            var validator=factory.getValidator();
            assertThat(validator.validate(new com.silverroute.dto.UpdatePreferencesRequest("Normal",null,null,null))).hasSize(3);
            assertThat(validator.validate(new com.silverroute.dto.UpdatePreferencesRequest("Normal",0,100,true))).isEmpty();
            assertThat(validator.validate(new com.silverroute.dto.UpdatePreferencesRequest("Other",-1,101,true))).hasSize(3);
        }
    }
}
