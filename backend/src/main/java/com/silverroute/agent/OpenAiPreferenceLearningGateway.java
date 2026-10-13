package com.silverroute.agent;

import java.nio.charset.StandardCharsets;
import java.util.*;
import com.fasterxml.jackson.databind.*;
import com.silverroute.exception.ModelAgentException;
import com.silverroute.routing.ProviderHttp;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@Profile("!mock")
public class OpenAiPreferenceLearningGateway implements PreferenceLearningGateway {
    private final String apiKey, model, prompt;
    private final RestClient client;
    private final ObjectMapper mapper = new ObjectMapper()
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
            .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);

    @org.springframework.beans.factory.annotation.Autowired
    public OpenAiPreferenceLearningGateway(@Value("${OPENAI_API_KEY:}") String apiKey,
            @Value("${OPENAI_MODEL:}") String model) {
        this(apiKey, model, ProviderHttp.client("https://api.openai.com/v1", 15));
    }
    public OpenAiPreferenceLearningGateway(String apiKey, String model, RestClient client) {
        this.apiKey=apiKey; this.model=model; this.client=client;
        try (var input=new ClassPathResource("ai/preference-learning-prompt.txt").getInputStream()) {
            prompt=new String(input.readAllBytes(),StandardCharsets.UTF_8);
        } catch(Exception e) { throw new IllegalStateException("Preference learning prompt is unavailable",e); }
    }
    @Override public PreferenceAdjustment assess(PreferenceLearningContext context) {
        if (apiKey.isBlank() || model.isBlank()) throw new ModelAgentException("AI preference learning is not configured");
        try {
            String response=client.post().uri("/responses").header("Authorization","Bearer "+apiKey)
                    .contentType(MediaType.APPLICATION_JSON).body(mapper.writeValueAsString(requestBody(context)))
                    .retrieve().body(String.class);
            return parseResponse(response);
        } catch(ModelAgentException e) { throw e; }
        catch(Exception e) { throw new ModelAgentException("AI preference learning is unavailable",e); }
    }
    public Map<String,Object> requestBody(PreferenceLearningContext context) throws Exception {
        var delta=Map.of("type","integer","minimum",-10,"maximum",10);
        var schema=Map.of("type","object","additionalProperties",false,
                "required",List.of("walkingDelta","shelterDelta","confidence","reason"),
                "properties",Map.of("walkingDelta",delta,"shelterDelta",delta,
                        "confidence",Map.of("type","string","enum",List.of("low","medium","high")),
                        "reason",Map.of("type","string")));
        return Map.of("model",model,"store",false,"max_output_tokens",1500,
                "input",List.of(Map.of("role","developer","content",prompt),
                        Map.of("role","user","content",mapper.writeValueAsString(context))),
                "text",Map.of("format",Map.of("type","json_schema","name","preference_adjustment","strict",true,"schema",schema)));
    }
    public PreferenceAdjustment parseResponse(String response) {
        try {
            JsonNode root=mapper.readTree(response);
            if (root==null || !"completed".equals(root.path("status").asText())) throw new IllegalArgumentException();
            List<String> texts=new ArrayList<>();
            for (var output:root.path("output")) {
                if (!"message".equals(output.path("type").asText())) continue;
                for (var content:output.path("content")) {
                    if ("refusal".equals(content.path("type").asText())) throw new IllegalArgumentException();
                    if ("output_text".equals(content.path("type").asText()) && content.path("text").isTextual())
                        texts.add(content.path("text").textValue());
                }
            }
            if (texts.size()!=1) throw new IllegalArgumentException();
            var json=mapper.readTree(texts.getFirst());
            if (!json.isObject() || json.size()!=4 || !json.path("walkingDelta").isIntegralNumber()
                    || !json.path("walkingDelta").canConvertToInt() || !json.path("shelterDelta").isIntegralNumber()
                    || !json.path("shelterDelta").canConvertToInt() || !json.path("confidence").isTextual()
                    || !json.path("reason").isTextual()) throw new IllegalArgumentException();
            var result=mapper.treeToValue(json,PreferenceAdjustment.class);
            result.validate();
            return result;
        } catch(Exception e) { throw new ModelAgentException("AI returned an invalid preference adjustment",e); }
    }
}
