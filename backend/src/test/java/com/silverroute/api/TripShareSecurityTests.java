package com.silverroute.api;

import java.time.Instant;
import java.util.UUID;
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
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import com.silverroute.config.SecurityConfig;
import com.silverroute.controller.TripShareController;
import com.silverroute.service.TripShareService;
import com.silverroute.repository.UserRepository;

@SpringJUnitConfig(TripShareSecurityTests.Config.class)
@WebAppConfiguration
class TripShareSecurityTests {
    @Configuration @EnableWebMvc @EnableWebSecurity
    @Import({SecurityConfig.class, TripShareController.class, GlobalExceptionHandler.class})
    static class Config {
        @Bean TripShareService service() { return mock(TripShareService.class); }
        @Bean UserRepository users() { return mock(UserRepository.class); }
    }
    @Autowired WebApplicationContext context;
    @Autowired TripShareService service;
    MockMvc mvc;
    String path = "/api/users/me/trip-shares";
    String body = "{\"origin\":\"Home\",\"destination\":\"Clinic\",\"routeSummary\":\"Bus 10\",\"estimatedArrival\":\"2099-01-01T10:00:00Z\",\"liveLocation\":false}";
    @BeforeEach void setup() {
        reset(service);
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }
    @Test void anonymousCanReadPublicLink() throws Exception {
        when(service.read("secret")).thenReturn(new TripShareService.PublicView("Home", "Clinic", "Bus 10",
                Instant.now().plusSeconds(300), Instant.now().plusSeconds(600), false, null, null, null));
        mvc.perform(get("/api/shared-trips/secret")).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.origin").value("Home"))
                .andExpect(jsonPath("$.id").doesNotExist()).andExpect(jsonPath("$.token").doesNotExist());
    }
    @Test void invalidLinkReturnsOnlyClearMessage() throws Exception {
        when(service.read("bad")).thenThrow(new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND));
        mvc.perform(get("/api/shared-trips/bad")).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").exists()).andExpect(jsonPath("$.origin").doesNotExist())
                .andExpect(jsonPath("$.latitude").doesNotExist());
    }
    @Test void arrivedLinkReturnsOnlyArrivalMessage() throws Exception {
        when(service.read("done")).thenThrow(new org.springframework.web.server.ResponseStatusException(
                HttpStatus.GONE, "They have arrived. Trip sharing has ended."));
        mvc.perform(get("/api/shared-trips/done")).andExpect(status().isGone())
                .andExpect(jsonPath("$.message").value("They have arrived. Trip sharing has ended."))
                .andExpect(jsonPath("$.origin").doesNotExist());
    }
    @Test void anonymousCannotListCreateUpdateOrStop() throws Exception {
        mvc.perform(get(path)).andExpect(status().isUnauthorized());
        mvc.perform(post(path).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isUnauthorized());
        mvc.perform(put(path + "/" + UUID.randomUUID() + "/location").with(csrf())).andExpect(status().isUnauthorized());
        mvc.perform(delete(path + "/" + UUID.randomUUID()).with(csrf())).andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }
    @Test void mutationsRequireCsrf() throws Exception {
        mvc.perform(post(path).with(user("alice")).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        mvc.perform(put(path + "/" + UUID.randomUUID() + "/location").with(user("alice"))).andExpect(status().isForbidden());
        mvc.perform(delete(path + "/" + UUID.randomUUID()).with(user("alice"))).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }
    @Test void createUsesSessionIdentityAndValidatesArrival() throws Exception {
        mvc.perform(post(path).with(user("alice")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());
        verify(service).create(eq("alice"), any());
        reset(service);
        mvc.perform(post(path).with(user("alice")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body.replace("2099-01-01T10:00:00Z", "2000-01-01T10:00:00Z"))).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
    @Test void updatesUseSessionIdentityAndRejectInvalidCoordinates() throws Exception {
        UUID id = UUID.randomUUID();
        String location = "{\"latitude\":1.3,\"longitude\":103.8}";
        mvc.perform(put(path + "/" + id + "/location").with(user("alice")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(location)).andExpect(status().isNoContent());
        verify(service).update(eq("alice"), eq(id), any());
        reset(service);
        mvc.perform(put(path + "/" + id + "/location").with(user("alice")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(location.replace("1.3", "95"))).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
        mvc.perform(delete(path + "/" + id).with(user("alice")).with(csrf())).andExpect(status().isNoContent());
        verify(service).stop("alice", id, false);
        mvc.perform(delete(path + "/" + id + "?arrived=true").with(user("alice")).with(csrf())).andExpect(status().isNoContent());
        verify(service).stop("alice", id, true);
    }
}
