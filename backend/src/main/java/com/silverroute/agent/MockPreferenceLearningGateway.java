package com.silverroute.agent;

@org.springframework.stereotype.Component
@org.springframework.context.annotation.Profile("mock")
public class MockPreferenceLearningGateway implements PreferenceLearningGateway {
    public PreferenceAdjustment assess(PreferenceLearningContext context) {
        return new PreferenceAdjustment(0, 0, "low", "Demo mode does not learn preferences.");
    }
}
