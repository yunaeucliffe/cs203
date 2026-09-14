package com.silverroute.agent;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import com.silverroute.api.TripRequest;

public final class AgentState {

    private final TripRequest request;
    private final List<ToolObservation> observations = new ArrayList<>();

    public AgentState(TripRequest request) {
        this.request = request;
    }

    public TripRequest request() {
        return request;
    }

    public List<ToolObservation> observations() {
        return Collections.unmodifiableList(observations);
    }

    public void addObservation(ToolObservation observation) {
        observations.add(observation);
    }
}
