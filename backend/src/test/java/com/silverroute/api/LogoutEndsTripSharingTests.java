package com.silverroute.api;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import com.silverroute.config.SecurityConfig;
import com.silverroute.controller.AuthController;
import com.silverroute.repository.UserRepository;
import com.silverroute.service.AuthService;
import com.silverroute.service.TripShareService;

// Signing out must end trip and live location sharing, not leave the family link live for 24 hours.
@SpringJUnitConfig(LogoutEndsTripSharingTests.Config.class)
@WebAppConfiguration
class LogoutEndsTripSharingTests {
    @Configuration @EnableWebMvc @EnableWebSecurity
    @Import({SecurityConfig.class, AuthController.class, GlobalExceptionHandler.class})
    static class Config {
        @Bean AuthService authService() { return mock(AuthService.class); }
        @Bean TripShareService tripShareService() { return mock(TripShareService.class); }
        @Bean UserRepository users() { return mock(UserRepository.class); }
    }
    @Autowired WebApplicationContext context;
    @Autowired TripShareService shares;
    MockMvc mvc;
    @BeforeEach void setup() {
        reset(shares);
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test void logoutEndsTheSignedInUsersSharesAndSession() throws Exception {
        var session = new MockHttpSession();
        mvc.perform(post("/api/auth/logout").session(session).with(user("owner@example.com")).with(csrf()))
                .andExpect(status().isNoContent());
        verify(shares).signOut("owner@example.com", session.getId());
        assertThat(session.isInvalid()).isTrue();
    }

    // Includes a failed commit: Spring rethrows it from signOut once the transaction rolls back.
    @Test void userStaysSignedInToRetryWhenSharingCannotBeEnded() throws Exception {
        var session = new MockHttpSession();
        doThrow(new DataAccessResourceFailureException("commit failed")).when(shares).signOut(any(), any());
        mvc.perform(post("/api/auth/logout").session(session).with(user("owner@example.com")).with(csrf()))
                .andExpect(status().isInternalServerError());
        assertThat(session.isInvalid()).isFalse();
    }

    @Test void anonymousLogoutEndsNoShares() throws Exception {
        mvc.perform(post("/api/auth/logout").with(csrf())).andExpect(status().isNoContent());
        verifyNoInteractions(shares);
    }

    @Test void logoutWithoutCsrfCannotEndShares() throws Exception {
        mvc.perform(post("/api/auth/logout").with(user("owner@example.com"))).andExpect(status().isForbidden());
        verifyNoInteractions(shares);
    }
}
