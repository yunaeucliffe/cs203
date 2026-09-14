package com.silverroute.agent;

import java.util.List;

import com.silverroute.tool.ToolDefinition;

public interface ModelGateway {

    AgentAction nextAction(AgentState state, List<ToolDefinition> availableTools);
}
