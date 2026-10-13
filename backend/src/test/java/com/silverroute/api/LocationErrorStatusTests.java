package com.silverroute.api;

import com.silverroute.controller.LocationController;
import com.silverroute.exception.RouteDataUnavailableException;
import com.silverroute.service.OneMapService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class LocationErrorStatusTests {
    private OneMapService service;
    private MockMvc mvc;

    @BeforeEach void setup() {
        service = spy(new OneMapService());
        mvc = MockMvcBuilders.standaloneSetup(new LocationController(service))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @Test void blankAddressReturnsBadRequestOnBothEndpoints() throws Exception {
        for (String endpoint : new String[] {"/api/location/search", "/api/location/parsed"}) {
            mvc.perform(get(endpoint).param("query", "   "))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.message").value("Enter an address, building name or six-digit postal code."));
        }
    }

    @Test void unmatchedAddressReturnsNotFound() throws Exception {
        doReturn("{\"results\":[]}").when(service).searchLocation("Unknown");
        mvc.perform(get("/api/location/parsed").param("query", "Unknown"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test void providerUnavailableStillReturnsServiceUnavailable() throws Exception {
        doThrow(new RouteDataUnavailableException("Provider unavailable"))
                .when(service).searchLocation("Hospital");
        mvc.perform(get("/api/location/parsed").param("query", "Hospital"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value(503));
    }
}
