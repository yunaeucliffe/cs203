package com.silverroute.controller;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import com.silverroute.api.GlobalExceptionHandler;
import com.silverroute.service.TripShareService;

@SpringJUnitConfig(ScheduledTaskControllerTests.Config.class)
@WebAppConfiguration
@TestPropertySource(properties = "cron.secret=test-secret")
class ScheduledTaskControllerTests {

    @Configuration
    @EnableWebMvc
    @Import({ScheduledTaskController.class, GlobalExceptionHandler.class})
    static class Config {
        @Bean
        TripShareService tripShareService() {
            return mock(TripShareService.class);
        }
    }

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private TripShareService tripShareService;

    private MockMvc mvc;

    private static final String PATH = "/api/internal/trip-shares/cleanup";

    @BeforeEach
    void setUp() {
        reset(tripShareService);
        mvc = MockMvcBuilders.webAppContextSetup(context).build();
    }

    @Test
    void rejectsRequestsWithoutTheSecret() throws Exception {
        mvc.perform(get(PATH)).andExpect(status().isUnauthorized());
        verifyNoInteractions(tripShareService);
    }

    @Test
    void rejectsRequestsWithTheWrongSecret() throws Exception {
        mvc.perform(get(PATH).header("Authorization", "Bearer wrong-secret"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(tripShareService);
    }

    @Test
    void runsCleanupWhenTheSecretMatches() throws Exception {
        mvc.perform(get(PATH).header("Authorization", "Bearer test-secret"))
                .andExpect(status().isNoContent());
        verify(tripShareService).deleteExpired();
    }
}
