package com.silverroute.api;

import java.util.List;
import org.junit.jupiter.api.*;
import org.springframework.context.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.http.MediaType;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import com.silverroute.agent.*;
import com.silverroute.config.SecurityConfig;
import com.silverroute.routing.TestRoutes;

@SpringJUnitConfig(RouteRecommendationSecurityTests.Config.class)
@WebAppConfiguration
class RouteRecommendationSecurityTests {
    @Configuration @EnableWebMvc @EnableWebSecurity
    @Import({SecurityConfig.class,RouteRecommendationController.class,GlobalExceptionHandler.class})
    static class Config {
        @Bean com.silverroute.service.RouteChoiceService choices() { return mock(com.silverroute.service.RouteChoiceService.class); }
        @Bean RouteRecommendationAgent agent() { return mock(RouteRecommendationAgent.class); }
        @Bean com.silverroute.repository.UserRepository users() { return mock(com.silverroute.repository.UserRepository.class); }
    }
    @Autowired WebApplicationContext context;
    @Autowired RouteRecommendationAgent agent;
    @Autowired com.silverroute.service.RouteChoiceService choices;
    MockMvc mvc;
    String body="{\"origin\":\"A\",\"destination\":\"B\",\"departureTime\":\"2026-09-28T08:00:00+08:00\"}";
    @BeforeEach void setup() {
        reset(agent,choices); mvc=MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }
    @Test void anonymousRequestWithCsrfIsRejected() throws Exception {
        mvc.perform(post("/api/route-recommendations").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized()); verifyNoInteractions(agent);
    }
    @Test void authenticatedRequestWithoutCsrfIsRejected() throws Exception {
        mvc.perform(post("/api/route-recommendations").with(user("alice@example.com")).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden()); verifyNoInteractions(agent);
    }
    @Test void usesSessionIdentityAndDoesNotRequireClientPreferences() throws Exception {
        when(agent.recommend(any(),anyString())).thenReturn(new AgentRecommendation(TestRoutes.route(),List.of(),List.of("Reason"),List.of(),List.of("OneMap"),"test"));
        mvc.perform(post("/api/route-recommendations").with(user("alice@example.com")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.recommendedRoute.id").value("onemap-route-1"));
        verify(agent).recommend(any(),eq("alice@example.com"));
        mvc.perform(post("/api/route-recommendations").with(user("bob@example.com")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());
        verify(agent).recommend(any(),eq("bob@example.com"));
    }
    @Test void rejectsOutOfRangeCoordinates() throws Exception {
        String invalid=body.substring(0,body.length()-1)+",\"originCoordinates\":{\"latitude\":95,\"longitude\":103.8}}";
        mvc.perform(post("/api/route-recommendations").with(user("alice")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(invalid)).andExpect(status().isBadRequest());
        verifyNoInteractions(agent);
    }
    @Test void rejectsInvalidTripBeforeAgentWork() throws Exception {
        mvc.perform(post("/api/route-recommendations").with(user("alice")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body.replace("\"origin\":\"A\"","\"origin\":\"\""))).andExpect(status().isBadRequest());
        verifyNoInteractions(agent);
    }

    @Test void choiceRequiresAuthenticationAndCsrfAndUsesSessionIdentity() throws Exception {
        String id=java.util.UUID.randomUUID().toString();
        String path="/api/route-recommendations/"+id+"/choice";
        mvc.perform(post(path).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"routeId\":\"alt\",\"choiceVersion\":0}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post(path).with(user("alice")).contentType(MediaType.APPLICATION_JSON).content("{\"routeId\":\"alt\",\"choiceVersion\":0}"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(choices);
        mvc.perform(post(path).with(user("alice")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"routeId\":\"alt\",\"choiceVersion\":0}"))
                .andExpect(status().isOk());
        verify(choices).choose("alice",java.util.UUID.fromString(id),"alt",0);
    }

    @Test void malformedChoiceIdIsBadRequest() throws Exception {
        mvc.perform(post("/api/route-recommendations/not-a-uuid/choice").with(user("alice")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"routeId\":\"alt\",\"choiceVersion\":0}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(choices);
    }

    @Test void undoRequiresAuthenticationCsrfAndConfirmedVersion() throws Exception {
        String id=java.util.UUID.randomUUID().toString();
        String path="/api/route-recommendations/"+id+"/choice/undo";
        mvc.perform(post(path).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"choiceVersion\":1}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post(path).with(user("alice")).contentType(MediaType.APPLICATION_JSON).content("{\"choiceVersion\":1}"))
                .andExpect(status().isForbidden());
        mvc.perform(post(path).with(user("alice")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"choiceVersion\":0}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(choices);
        mvc.perform(post(path).with(user("alice")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"choiceVersion\":1}"))
                .andExpect(status().isOk());
        verify(choices).undo("alice",java.util.UUID.fromString(id),1);
    }
}
