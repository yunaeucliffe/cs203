package com.silverroute.agent;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.Test;

import com.silverroute.api.RouteOption;
import com.silverroute.api.TripPreferences;
import com.silverroute.api.TripRequest;
import com.silverroute.exception.AgentLoopLimitException;
import com.silverroute.exception.ModelAgentException;
import com.silverroute.exception.RouteDataUnavailableException;
import com.silverroute.exception.UnknownToolException;
import com.silverroute.tool.RouteDataTool;
import com.silverroute.tool.ToolExecutionResult;
import com.silverroute.tool.ToolRegistry;

class RouteRecommendationAgentTests {

    @Test
    void modelRequestsARegisteredToolAndUsesItsResult() {
        TrackingTool tool = new TrackingTool("routes", false);
        RouteRecommendationAgent agent = agent(new MockModelGateway(), tool);

        AgentRecommendation result = agent.recommend(request());

        assertThat(tool.calls).isEqualTo(1);
        assertThat(result.recommendedRoute().id()).isEqualTo("accessible-route");
        assertThat(result.sources()).containsExactly("routes");
    }

    @Test
    void continuesToAnotherToolWhenTheFirstToolFails() {
        TrackingTool failing = new TrackingTool("failing-routes", true);
        TrackingTool working = new TrackingTool("working-routes", false);
        RouteRecommendationAgent agent = agent(new MockModelGateway(), failing, working);

        AgentRecommendation result = agent.recommend(request());

        assertThat(failing.calls).isEqualTo(1);
        assertThat(working.calls).isEqualTo(1);
        assertThat(result.sources()).containsExactly("working-routes");
        assertThat(result.warnings()).anyMatch(message -> message.contains("failing-routes"));
    }

    @Test
    void returnsUnavailableWhenNoToolProducesData() {
        RouteRecommendationAgent agent = agent(
                new MockModelGateway(),
                new TrackingTool("first", true),
                new TrackingTool("second", true));

        assertThatThrownBy(() -> agent.recommend(request()))
                .isInstanceOf(RouteDataUnavailableException.class);
    }

    @Test
    void refusesAnUnknownToolRequestedByTheModel() {
        ModelGateway unknownToolModel = (state, tools) -> new ToolCallAction("not-registered");
        RouteRecommendationAgent agent = agent(unknownToolModel, new TrackingTool("routes", false));

        assertThatThrownBy(() -> agent.recommend(request()))
                .isInstanceOf(UnknownToolException.class);
    }

    @Test
    void stopsAfterFiveToolCalls() {
        ModelGateway loopingModel = (state, tools) -> new ToolCallAction("routes");
        TrackingTool tool = new TrackingTool("routes", false);
        RouteRecommendationAgent agent = agent(loopingModel, tool);

        assertThatThrownBy(() -> agent.recommend(request()))
                .isInstanceOf(AgentLoopLimitException.class);
        assertThat(tool.calls).isEqualTo(5);
    }

    @Test
    void wrapsUnexpectedModelFailures() {
        ModelGateway failingModel = (state, tools) -> {
            throw new IllegalStateException("provider outage");
        };
        RouteRecommendationAgent agent = agent(failingModel, new TrackingTool("routes", false));

        assertThatThrownBy(() -> agent.recommend(request()))
                .isInstanceOf(ModelAgentException.class)
                .hasMessageContaining("could not produce");
    }

    private RouteRecommendationAgent agent(ModelGateway modelGateway, RouteDataTool... tools) {
        return new RouteRecommendationAgent(modelGateway, new ToolRegistry(List.of(tools)));
    }

    private TripRequest request() {
        return new TripRequest(
                "Origin",
                "Destination",
                OffsetDateTime.parse("2026-09-14T14:00:00+08:00"),
                new TripPreferences(10, true, true));
    }

    private static final class TrackingTool implements RouteDataTool {

        private final String name;
        private final boolean fail;
        private int calls;

        private TrackingTool(String name, boolean fail) {
            this.name = name;
            this.fail = fail;
        }

        @Override
        public String name() {
            return name;
        }

        @Override
        public String description() {
            return "Test route tool";
        }

        @Override
        public ToolExecutionResult execute(TripRequest request) {
            calls++;
            if (fail) {
                throw new IllegalStateException("simulated outage");
            }
            return new ToolExecutionResult(
                    name,
                    List.of(new RouteOption(
                            "accessible-route", "Accessible route", 30, 4, 0, true)),
                    List.of());
        }
    }
}
