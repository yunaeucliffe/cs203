package com.silverroute.service;

import com.silverroute.api.LocationResult;
import com.silverroute.api.LocationSuggestion;
import com.silverroute.controller.LocationController;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class LocationSearchTests {
    @Test void postalCodesCanBeSearchedWithoutLosingLeadingZeros() throws Exception {
        var provider = mock(OneMapService.class);
        var place = new LocationSuggestion("Building", "1 Road Singapore 012345", 1.3, 103.8);
        when(provider.searchLocation("012345")).thenReturn("json");
        when(provider.parseSuggestions("json")).thenReturn(List.of(place));

        var response = new LocationController(provider).suggestions(" 012345 ");

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isEqualTo(List.of(place));
        verify(provider).searchLocation("012345");
    }

    @Test void rawSearchStillReturnsTheProviderResponse() {
        var provider = mock(OneMapService.class);
        when(provider.searchLocation("Hospital")).thenReturn("provider-json");

        assertThat(new LocationController(provider).searchLocation("Hospital"))
                .isEqualTo("provider-json");
    }

    @Test void parsedSearchStillReturnsAResolvedLocation() throws Exception {
        var provider = mock(OneMapService.class);
        var place = new LocationResult("Hospital", 1.3, 103.8);
        when(provider.searchLocation("Hospital")).thenReturn("json");
        when(provider.parseLocation("json")).thenReturn(place);

        assertThat(new LocationController(provider).searchLocationParsed("Hospital")).isEqualTo(place);
    }
}
