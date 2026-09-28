package com.silverroute.agent;

import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.http.MediaType;
import org.springframework.http.HttpMethod;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;
import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.silverroute.exception.ModelAgentException;
import com.silverroute.routing.TestRoutes;

class OpenAiModelGatewayTests {
    private OpenAiModelGateway gateway() { return new OpenAiModelGateway("test-key","configured-model",RestClient.create()); }
    private String response(String text) throws Exception {
        return new ObjectMapper().writeValueAsString(Map.of("status","completed","output",List.of(
                Map.of("type","message","content",List.of(Map.of("type","output_text","text",text))))));
    }
    @Test void parsesStructuredOutputAndBuildsStrictAllowlistedSchema() throws Exception {
        var model=gateway();
        var result=model.parseResponse(response("{\"rankings\":[{\"routeId\":\"onemap-route-1\",\"reasons\":[\"Less walking\"],\"warnings\":[]}]}"));
        assertThat(result.rankings().getFirst().routeId()).isEqualTo("onemap-route-1");
        var body=new ObjectMapper().valueToTree(model.requestBody(TestRoutes.trip().context()));
        assertThat(body.path("store").asBoolean()).isFalse();
        assertThat(body.at("/text/format/strict").asBoolean()).isTrue();
        assertThat(body.at("/text/format/schema/properties/rankings/items/properties/routeId/enum/0").asText()).isEqualTo("onemap-route-1");
        assertThat(body.at("/text/format/schema/properties/rankings/maxItems").asInt()).isEqualTo(1);
        assertThat(body.toString()).doesNotContain("test-key","routePaths","Secret Name");
    }
    @Test void rejectsRefusalsIncompleteAndMalformedResponses() throws Exception {
        var model=gateway();
        for(String invalid:List.of("null","{}","{\"status\":\"incomplete\"}",
                "{\"status\":\"completed\",\"output\":[{\"type\":\"message\",\"content\":[{\"type\":\"refusal\"}]}]}",
                response("not json"),response("{\"rankings\":[{\"routeId\":1,\"reasons\":[],\"warnings\":[]}]}"),
                response("{\"rankings\":[],\"extra\":true}"))) {
            assertThatThrownBy(() -> model.parseResponse(invalid)).isInstanceOf(ModelAgentException.class);
        }
    }
    @Test void usesResponsesApiAndHidesProviderErrorBodies() throws Exception {
        var builder=RestClient.builder().baseUrl("https://api.openai.com/v1");
        var server=MockRestServiceServer.bindTo(builder).build();
        var gateway=new OpenAiModelGateway("test-key","configured-model",builder.build());
        server.expect(requestTo("https://api.openai.com/v1/responses")).andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization","Bearer test-key"))
                .andRespond(withBadRequest().body("sensitive-provider-diagnostics"));
        assertThatThrownBy(() -> gateway.rank(TestRoutes.trip().context())).isInstanceOf(ModelAgentException.class)
                .hasMessageNotContaining("sensitive-provider-diagnostics");
        server.verify();
    }
    @Test void fullMockHttpResponseIsValidatedWithoutLiveCredentials() throws Exception {
        var builder=RestClient.builder().baseUrl("https://api.openai.com/v1");
        var server=MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://api.openai.com/v1/responses")).andRespond(withSuccess(response(
                "{\"rankings\":[{\"routeId\":\"onemap-route-1\",\"reasons\":[\"22 metres walking\"],\"warnings\":[]}]}"),MediaType.APPLICATION_JSON));
        var gateway=new OpenAiModelGateway("test-key","configured-model",builder.build());
        var trip=TestRoutes.trip();
        var answer=RouteRecommendationAgent.validateAndBuild(trip,gateway.rank(trip.context()),gateway.engine());
        assertThat(answer.recommendedRoute().walkingDistanceMeters()).isEqualTo(22); server.verify();
    }
    @Test void missingConfigurationFailsClearly() {
        assertThatThrownBy(() -> new OpenAiModelGateway("","",RestClient.create()).rank(TestRoutes.trip().context()))
                .isInstanceOf(ModelAgentException.class).hasMessageContaining("not configured");
    }
}
