package com.silverroute.agent;

public sealed interface AgentAction permits ToolCallAction, FinalAnswerAction {
}
