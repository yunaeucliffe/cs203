package com.silverroute.agent;

public record PreferenceAdjustment(int walkingDelta, int shelterDelta, String confidence, String reason) {
    public void validate() {
        if (walkingDelta < -10 || walkingDelta > 10 || shelterDelta < -10 || shelterDelta > 10
                || confidence == null || !java.util.Set.of("low", "medium", "high").contains(confidence)
                || reason == null || reason.isBlank() || reason.length() > 400
                || (confidence.equals("low") && (walkingDelta != 0 || shelterDelta != 0))) {
            throw new IllegalArgumentException("Invalid AI preference adjustment");
        }
    }
}
