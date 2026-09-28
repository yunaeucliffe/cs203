package com.silverroute.agent;

import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import com.fasterxml.jackson.databind.*;
import com.silverroute.exception.ModelAgentException;
import com.silverroute.routing.*;

@Component
@Profile("!mock")
public class OpenAiModelGateway implements ModelGateway {
    private final String apiKey,model,prompt;
    private final RestClient client;
    private final ObjectMapper mapper=new ObjectMapper()
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
            .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);

    @org.springframework.beans.factory.annotation.Autowired
    public OpenAiModelGateway(@Value("${OPENAI_API_KEY:}") String apiKey,@Value("${OPENAI_MODEL:}") String model) {
        this(apiKey,model,ProviderHttp.client("https://api.openai.com/v1",45));
    }
    public OpenAiModelGateway(String apiKey,String model,RestClient client) {
        this.apiKey=apiKey; this.model=model; this.client=client;
        try(var input=new ClassPathResource("ai/route-ranking-prompt.txt").getInputStream()) {
            prompt=new String(input.readAllBytes(),StandardCharsets.UTF_8);
        } catch(Exception exception) { throw new IllegalStateException("Route ranking prompt is unavailable",exception); }
    }
    @Override public String engine() { return "openai:"+model; }
    @Override public RankingResult rank(RouteContext context) {
        if(apiKey.isBlank() || model.isBlank()) throw new ModelAgentException("OpenAI ranking is not configured; set OPENAI_API_KEY and OPENAI_MODEL on the backend");
        try {
            String body=mapper.writeValueAsString(requestBody(context));
            String response=client.post().uri("/responses")
                    .header("Authorization","Bearer "+apiKey).contentType(MediaType.APPLICATION_JSON)
                    .body(body).retrieve().body(String.class);
            return parseResponse(response);
        } catch(ModelAgentException exception) { throw exception; }
        catch(Exception exception) {
            throw new ModelAgentException("OpenAI ranking is temporarily unavailable; please try again",exception);
        }
    }
    public Map<String,Object> requestBody(RouteContext context) throws Exception {
        String input=mapper.writeValueAsString(context);
        if(input.length()>80000) throw new ModelAgentException("Route evidence exceeds the ranking input limit");
        List<String> ids=context.candidates().stream().map(RouteContext.Candidate::id).toList();
        if(ids.isEmpty()) throw new ModelAgentException("No candidates were supplied to the model");
        Map<String,Object> strings=Map.of("type","array","items",Map.of("type","string"));
        Map<String,Object> selection=Map.of("type","object","additionalProperties",false,
                "required",List.of("routeId","reasons","warnings"),"properties",Map.of(
                "routeId",Map.of("type","string","enum",ids),"reasons",strings,"warnings",strings));
        Map<String,Object> schema=Map.of("type","object","additionalProperties",false,"required",List.of("rankings"),
                "properties",Map.of("rankings",Map.of("type","array","minItems",Math.min(3,ids.size()),
                        "maxItems",Math.min(3,ids.size()),"items",selection)));
        return Map.of("model",model,"store",false,"max_output_tokens",2500,
                "input",List.of(Map.of("role","developer","content",prompt),Map.of("role","user","content",input)),
                "text",Map.of("format",Map.of("type","json_schema","name","route_rankings","strict",true,"schema",schema)));
    }
    public RankingResult parseResponse(String response) {
        try {
            JsonNode root=mapper.readTree(response);
            if(root==null || !"completed".equals(root.path("status").asText()))
                throw new ModelAgentException("OpenAI did not complete the route ranking");
            List<String> texts=new ArrayList<>();
            for(JsonNode output:root.path("output")) {
                if(!"message".equals(output.path("type").asText())) continue;
                for(JsonNode content:output.path("content")) {
                    if("refusal".equals(content.path("type").asText()))
                        throw new ModelAgentException("OpenAI declined to rank these routes");
                    if("output_text".equals(content.path("type").asText()) && content.path("text").isTextual()) texts.add(content.get("text").textValue());
                }
            }
            if(texts.size()!=1) throw new ModelAgentException("OpenAI returned an invalid ranking response");
            JsonNode json=mapper.readTree(texts.getFirst());
            if(!json.isObject() || json.size()!=1 || !json.path("rankings").isArray()) throw new IllegalArgumentException("Invalid rankings");
            for(JsonNode item:json.path("rankings")) {
                if(!item.isObject() || item.size()!=3 || !item.path("routeId").isTextual()
                        || !item.path("reasons").isArray() || !item.path("warnings").isArray()) throw new IllegalArgumentException("Invalid selection");
                for(String field:List.of("reasons","warnings")) for(JsonNode text:item.path(field))
                    if(!text.isTextual()) throw new IllegalArgumentException("Invalid explanation");
            }
            return mapper.treeToValue(json,RankingResult.class);
        } catch(ModelAgentException exception) { throw exception; }
        catch(Exception exception) { throw new ModelAgentException("OpenAI returned malformed route rankings",exception); }
    }
}
