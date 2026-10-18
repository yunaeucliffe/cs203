package com.silverroute.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import com.silverroute.api.GlobalExceptionHandler;
import com.silverroute.config.SecurityConfig;
import com.silverroute.service.ProfileService;

@SpringJUnitConfig(AccountDeletionControllerTests.Config.class)
@WebAppConfiguration
class AccountDeletionControllerTests {

    @Configuration
    @EnableWebMvc
    @EnableWebSecurity
    @Import({SecurityConfig.class, ProfileController.class, GlobalExceptionHandler.class})
    static class Config {
        @Bean
        ProfileService profileService() {
            return mock(ProfileService.class);
        }
    }

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private ProfileService profileService;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        reset(profileService);
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    void deletionRequiresLoginAndCsrf() throws Exception {
        mvc.perform(delete("/api/users/me").with(csrf()))
                .andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/users/me").with(user("mary@example.com")))
                .andExpect(status().isForbidden());

        verifyNoInteractions(profileService);
    }

    @Test
    void deletesTheSessionUserAndLogsThemOut() throws Exception {
        MockHttpSession session = new MockHttpSession();

        mvc.perform(delete("/api/users/me").session(session).with(user("mary@example.com")).with(csrf()))
                .andExpect(status().isNoContent());

        verify(profileService).deleteAccount("mary@example.com");
        assertThat(session.isInvalid()).isTrue();
    }

    @Test
    void failedDeletionReturnsAnErrorAndKeepsTheUserSignedIn() throws Exception {
        doThrow(new RuntimeException("database unavailable"))
                .when(profileService).deleteAccount("mary@example.com");
        MockHttpSession session = new MockHttpSession();

        mvc.perform(delete("/api/users/me").session(session).with(user("mary@example.com")).with(csrf()))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("An unexpected server error occurred"));

        assertThat(session.isInvalid()).isFalse();
    }
}
