package com.silverroute.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Optional;

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
import com.silverroute.config.DeletedAccountFilter;
import com.silverroute.config.SecurityConfig;
import com.silverroute.dto.ProfileResponse;
import com.silverroute.repository.UserRepository;
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

        @Bean
        UserRepository userRepository() {
            return mock(UserRepository.class);
        }
    }

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private ProfileService profileService;

    @Autowired
    private UserRepository userRepository;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        reset(profileService, userRepository);
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

    @Test
    void otherSessionsAreSignedOutOnceTheAccountIsDeleted() throws Exception {
        // A session on another device that signed in to account 1 before it was deleted.
        // Even if someone re-registers mary@example.com (a new id), this session must not reach it.
        MockHttpSession otherSession = new MockHttpSession();
        otherSession.setAttribute(DeletedAccountFilter.USER_ID_ATTRIBUTE, 1L);
        when(userRepository.existsById(1L)).thenReturn(false);

        mvc.perform(get("/api/users/me/profile").session(otherSession).with(user("mary@example.com")))
                .andExpect(status().isUnauthorized());

        assertThat(otherSession.isInvalid()).isTrue();
        verifyNoInteractions(profileService);
    }

    @Test
    void sessionsForAccountsThatStillExistKeepWorking() throws Exception {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute(DeletedAccountFilter.USER_ID_ATTRIBUTE, 1L);
        when(userRepository.existsById(1L)).thenReturn(true);
        when(profileService.getProfileByEmail("mary@example.com")).thenReturn(Optional.of(
                new ProfileResponse(1L, "Mary", "mary", "mary@example.com", "Normal", 50, 20, false)));

        mvc.perform(get("/api/users/me/profile").session(session).with(user("mary@example.com")))
                .andExpect(status().isOk());

        assertThat(session.isInvalid()).isFalse();
    }
}
