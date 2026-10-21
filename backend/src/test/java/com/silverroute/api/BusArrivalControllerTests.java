package com.silverroute.api;

import java.util.Map;
import java.util.List;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.mockito.Mockito.*;
import com.silverroute.config.SecurityConfig;
import com.silverroute.routing.RouteEvidence;
import com.silverroute.service.RouteConditionsService;

@SpringJUnitConfig(BusArrivalControllerTests.Config.class)
@WebAppConfiguration
class BusArrivalControllerTests {
    @Configuration @EnableWebMvc @EnableWebSecurity
    @Import({SecurityConfig.class, BusArrivalController.class, GlobalExceptionHandler.class})
    static class Config {
        @Bean RouteConditionsService conditions() { return mock(RouteConditionsService.class); }
        @Bean com.silverroute.repository.UserRepository users() { return mock(com.silverroute.repository.UserRepository.class); }
    }
    @Autowired WebApplicationContext context;
    @Autowired RouteConditionsService conditions;
    MockMvc mvc;

    @BeforeEach void setup() {
        reset(conditions);
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test void authenticatedRequestReturnsMatchingServiceEvidence() throws Exception {
        var evidence = new RouteEvidence("LTA BusArrival", null, "2026-09-28T00:00:00Z",
                "available", Map.of("busStopCode", "01234", "service", "97",
                    "arrivals", List.of(Map.of("EstimatedArrival", "2026-09-28T08:05:00+08:00"))));
        when(conditions.refreshBusArrivals("01234", "97")).thenReturn(evidence);
        mvc.perform(get("/api/bus-arrival-estimates").with(user("alice@example.com"))
                .param("busStopCode", "01234").param("service", "97"))
                .andExpect(status().isOk())
                .andExpect(content().json(new ObjectMapper().writeValueAsString(evidence)))
                .andExpect(jsonPath("$.source").value(evidence.source()))
                .andExpect(jsonPath("$.retrievedAt").value(evidence.retrievedAt()))
                .andExpect(jsonPath("$.availability").value("available"))
                .andExpect(jsonPath("$.details.busStopCode").value("01234"))
                .andExpect(jsonPath("$.details.service").value("97"));
        verify(conditions).refreshBusArrivals("01234", "97");
        verifyNoMoreInteractions(conditions);
    }

    @Test void invalidStopCodesAreRejectedBeforeCallingService() throws Exception {
        for (String code : new String[]{"", "1234", "123456", "12a45", "-1234"}) {
            mvc.perform(get("/api/bus-arrival-estimates").with(user("alice"))
                    .param("busStopCode", code).param("service", "97"))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(conditions);
    }

    @Test void invalidServicesAreRejectedBeforeCallingService() throws Exception {
        for (String service : new String[]{"", "12345678901", "97!", "97 A"}) {
            mvc.perform(get("/api/bus-arrival-estimates").with(user("alice"))
                    .param("busStopCode", "01234").param("service", service))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(conditions);
    }

    @Test void anonymousRequestIsRejected() throws Exception {
        mvc.perform(get("/api/bus-arrival-estimates")
                .param("busStopCode", "01234").param("service", "97"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(conditions);
    }
}
