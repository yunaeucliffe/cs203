package com.silverroute.agent;

/** Proposes bounded changes; persistence and authorization remain in the backend. */
public interface PreferenceLearningGateway {
    PreferenceAdjustment assess(PreferenceLearningContext context);
}
