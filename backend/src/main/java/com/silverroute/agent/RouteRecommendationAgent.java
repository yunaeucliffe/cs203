package com.silverroute.agent;

import org.springframework.stereotype.Service;

import com.silverroute.api.TripRequest;
import com.silverroute.exception.AgentLoopLimitException;
import com.silverroute.exception.ModelAgentException;
import com.silverroute.exception.RouteDataUnavailableException;
import com.silverroute.exception.ToolExecutionException;
import com.silverroute.tool.ToolExecutionResult;
import com.silverroute.tool.ToolRegistry;

@Service
public class RouteRecommendationAgent {

    static final int MAX_TOOL_CALLS = 5;

    private final ModelGateway modelGateway;
    private final ToolRegistry toolRegistry;

    public RouteRecommendationAgent(ModelGateway modelGateway, ToolRegistry toolRegistry) {
        this.modelGateway = modelGateway;
        this.toolRegistry = toolRegistry;
    }

    public AgentRecommendation recommend(TripRequest request) {
        AgentState state = new AgentState(request);
        int toolCalls = 0;

        while (true) {
            AgentAction action = nextAction(state);

            if (action instanceof FinalAnswerAction finalAnswer) {
                return finalAnswer.recommendation();
            }

            ToolCallAction toolCall = (ToolCallAction) action;
            if (toolCalls >= MAX_TOOL_CALLS) {
                throw new AgentLoopLimitException("The agent exceeded the maximum of five tool calls");
            }

            toolCalls++;
            try {
                ToolExecutionResult result = toolRegistry.execute(toolCall.toolName(), request);
                state.addObservation(ToolObservation.success(
                        toolCall.toolName(), result.source(), result.routes(), result.warnings()));
            } catch (ToolExecutionException exception) {
                state.addObservation(ToolObservation.failure(toolCall.toolName(), exception.getMessage()));
            }
        }
    }

    private AgentAction nextAction(AgentState state) {
        try {
            AgentAction action = modelGateway.nextAction(state, toolRegistry.definitions());
            if (action == null) {
                throw new ModelAgentException("The model agent returned no action");
            }
            return action;
        } catch (ModelAgentException | RouteDataUnavailableException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw new ModelAgentException("The model agent could not produce a recommendation", exception);
        }
    }
}
