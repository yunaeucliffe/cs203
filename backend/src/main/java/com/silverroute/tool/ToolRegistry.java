package com.silverroute.tool;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.silverroute.api.TripRequest;
import com.silverroute.exception.ToolExecutionException;
import com.silverroute.exception.UnknownToolException;

@Component
public class ToolRegistry {

    private final Map<String, RouteDataTool> tools;

    public ToolRegistry(List<RouteDataTool> routeDataTools) {
        Map<String, RouteDataTool> registeredTools = new LinkedHashMap<>();
        for (RouteDataTool tool : routeDataTools) {
            RouteDataTool existing = registeredTools.putIfAbsent(tool.name(), tool);
            if (existing != null) {
                throw new IllegalStateException("Duplicate route-data tool name: " + tool.name());
            }
        }
        this.tools = Collections.unmodifiableMap(new LinkedHashMap<>(registeredTools));
    }

    public List<ToolDefinition> definitions() {
        return tools.values().stream()
                .map(tool -> new ToolDefinition(tool.name(), tool.description()))
                .toList();
    }

    public ToolExecutionResult execute(String toolName, TripRequest request) {
        RouteDataTool tool = tools.get(toolName);
        if (tool == null) {
            throw new UnknownToolException("The agent requested an unknown tool: " + toolName);
        }

        try {
            ToolExecutionResult result = tool.execute(request);
            if (result == null) {
                throw new ToolExecutionException("Tool " + toolName + " returned no result");
            }
            return result;
        } catch (ToolExecutionException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ToolExecutionException("Tool " + toolName + " failed: " + exception.getMessage(), exception);
        }
    }
}
