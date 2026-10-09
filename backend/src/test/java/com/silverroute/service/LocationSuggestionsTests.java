package com.silverroute.service;

import com.silverroute.controller.LocationController;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.Map;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class LocationSuggestionsTests {
    private final OneMapService service = new OneMapService();

    @Test void preservesRankingAndSkipsDuplicatesAndInvalidCoordinates() throws Exception {
        var results = service.parseSuggestions("""
                {"results": [
                  {"BUILDING":"Hospital", "ADDRESS":"1 Road", "LATITUDE":"1.3", "LONGITUDE":"103.8"},
                  {"BUILDING":"Hospital", "ADDRESS":"1 ROAD", "LATITUDE":"1.3", "LONGITUDE":"103.8"},
                  {"BUILDING":"Bad", "ADDRESS":"2 Road", "LATITUDE":"NaN", "LONGITUDE":"103.8"},
                  {"BUILDING":"Bad", "ADDRESS":"3 Road", "LATITUDE":"abc", "LONGITUDE":"103.8"},
                  {"BUILDING":"Bad", "ADDRESS":"4 Road", "LATITUDE":"91", "LONGITUDE":"103.8"},
                  {"BUILDING":"NIL", "ADDRESS":"5 Road", "LATITUDE":"1.4", "LONGITUDE":"103.9"}
                ]}
                """);
        assertThat(results).hasSize(2);
        assertThat(results.get(0).name()).isEqualTo("Hospital");
        assertThat(results.get(0).address()).isEqualTo("1 Road");
        assertThat(results.get(0).latitude()).isEqualTo(1.3);
        assertThat(results.get(1).name()).isEqualTo("5 Road");
    }

    @Test void distinguishesEmptyResultsFromInvalidProviderResponse() throws Exception {
        assertThat(service.parseSuggestions("{\"results\":[]}")).isEmpty();
        assertThatThrownBy(() -> service.parseSuggestions("{\"error\":\"Invalid token\"}"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.parseSuggestions("invalid JSON")).isInstanceOf(Exception.class);
    }

    @Test void limitsSuggestionsToFive() throws Exception {
        var rows = java.util.stream.IntStream.range(0, 8)
                .mapToObj(i -> "{\"ADDRESS\":\"Road " + i + "\",\"LATITUDE\":\"1.3\",\"LONGITUDE\":\"103.8\"}")
                .collect(java.util.stream.Collectors.joining(","));
        assertThat(service.parseSuggestions("{\"results\":[" + rows + "]}"))
                .hasSize(5).extracting(result -> result.name()).containsExactly("Road 0", "Road 1", "Road 2", "Road 3", "Road 4");
    }

    @Test void validatesQueriesWithoutCallingProviderAndTrimsValidQueries() throws Exception {
        var provider = mock(OneMapService.class);
        var controller = new LocationController(provider);
        assertThat(controller.suggestions(" a ").getBody()).isEqualTo(List.of());
        assertThat(controller.suggestions("x".repeat(501)).getStatusCode().value()).isEqualTo(400);
        verifyNoInteractions(provider);
        when(provider.searchLocation("Hospital")).thenReturn("json");
        when(provider.parseSuggestions("json")).thenReturn(List.of());
        assertThat(controller.suggestions(" Hospital ").getStatusCode().value()).isEqualTo(200);
        verify(provider).searchLocation("Hospital");
    }

    @Test void doesNotExposeProviderDiagnostics() {
        var provider = mock(OneMapService.class);
        when(provider.searchLocation("Hospital")).thenThrow(new IllegalStateException("secret token"));
        var response = new LocationController(provider).suggestions("Hospital");
        assertThat(response.getStatusCode().value()).isEqualTo(503);
        assertThat(response.getBody()).isEqualTo(Map.of("message", "Location suggestions are unavailable. Try again."));
    }
}
