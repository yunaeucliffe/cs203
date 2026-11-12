package com.silverroute.agent;

import com.fasterxml.jackson.databind.JsonNode;
import com.silverroute.exception.ModelAgentException;

final class OpenAiResponse {
    private OpenAiResponse() {}

    static String outputText(JsonNode response, String refusalMessage, String invalidMessage) {
        String text = null;
        int count = 0;
        for (JsonNode output : response.path("output")) {
            if (!"message".equals(output.path("type").asText())) continue;
            for (JsonNode content : output.path("content")) {
                String type = content.path("type").asText();
                if ("refusal".equals(type)) throw new ModelAgentException(refusalMessage);
                if ("output_text".equals(type) && content.path("text").isTextual()) {
                    text = content.get("text").textValue();
                    count++;
                }
            }
        }
        if (count != 1) throw new ModelAgentException(invalidMessage);
        return text;
    }
}
