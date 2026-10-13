package com.silverroute.agent;

import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.http.MediaType;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;
import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.silverroute.exception.ModelAgentException;

class OpenAiPreferenceLearningGatewayTests {
    private final ObjectMapper mapper=new ObjectMapper();
    private final String valid="{\"walkingDelta\":-3,\"shelterDelta\":5,\"confidence\":\"medium\",\"reason\":\"More shelter despite extra walking.\"}";
    private OpenAiPreferenceLearningGateway gateway() { return new OpenAiPreferenceLearningGateway("test-key","configured-model",RestClient.create()); }
    private PreferenceLearningContext context() {
        return new PreferenceLearningContext(50,20,new PreferenceLearningContext.RouteMetrics(500.0,.2,5,20,1),
                new PreferenceLearningContext.RouteMetrics(700.0,.5,7,22,1));
    }
    private String response(String text) throws Exception {
        return mapper.writeValueAsString(Map.of("status","completed","output",List.of(
                Map.of("type","message","content",List.of(Map.of("type","output_text","text",text))))));
    }
    @Test void sendsStrictSchemaAndNumericContext() throws Exception {
        var body=mapper.valueToTree(gateway().requestBody(context()));
        assertThat(body.path("store").asBoolean()).isFalse();
        assertThat(body.at("/text/format/strict").asBoolean()).isTrue();
        assertThat(body.at("/text/format/schema/properties/walkingDelta/minimum").asInt()).isEqualTo(-10);
        assertThat(body.at("/text/format/schema/properties/shelterDelta/maximum").asInt()).isEqualTo(10);
        var data=mapper.readTree(body.at("/input/1/content").asText());
        assertThat(data.at("/chosen/shelteredWalkingShare").asDouble()).isEqualTo(.5);
        assertThat(data.toString()).doesNotContain("email","address","test-key");
    }
    @Test void validatesFullHttpResponse() throws Exception {
        var builder=RestClient.builder().baseUrl("https://api.openai.com/v1");
        var server=MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://api.openai.com/v1/responses"))
                .andExpect(header("Authorization","Bearer test-key"))
                .andRespond(withSuccess(response(valid),MediaType.APPLICATION_JSON));
        var result=new OpenAiPreferenceLearningGateway("test-key","configured-model",builder.build()).assess(context());
        assertThat(result.walkingDelta()).isEqualTo(-3);
        assertThat(result.shelterDelta()).isEqualTo(5);
        server.verify();
    }
    @Test void rejectsUnsafeAndMalformedAdjustments() throws Exception {
        for(String invalid:List.of("null","{}",valid.replace("-3","-11"),valid.replace("-3","-3.0"),
                valid.replace("-3","\"-3\""),valid.replace("medium","low"),valid.replace("medium","certain"),
                valid.replace("-3","2147483648"),valid.replace("}",",\"extra\":true}"),valid+" {}")) {
            assertThatThrownBy(() -> gateway().parseResponse(response(invalid))).isInstanceOf(ModelAgentException.class);
        }
        for(String invalid:List.of("null","{}","{\"status\":\"incomplete\"}",
                "{\"status\":\"completed\",\"output\":[{\"type\":\"message\",\"content\":[{\"type\":\"refusal\"}]}]}"))
            assertThatThrownBy(() -> gateway().parseResponse(invalid)).isInstanceOf(ModelAgentException.class);
    }
    @Test void hidesProviderErrorsAndRequiresConfiguration() {
        var builder=RestClient.builder().baseUrl("https://api.openai.com/v1");
        var server=MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://api.openai.com/v1/responses")).andRespond(withBadRequest().body("private-provider-details"));
        assertThatThrownBy(() -> new OpenAiPreferenceLearningGateway("key","model",builder.build()).assess(context()))
                .isInstanceOf(ModelAgentException.class).hasMessageNotContaining("private-provider-details");
        server.verify();
        assertThatThrownBy(() -> new OpenAiPreferenceLearningGateway("","",RestClient.create()).assess(context()))
                .isInstanceOf(ModelAgentException.class).hasMessageContaining("not configured");
    }
}
