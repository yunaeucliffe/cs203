package com.silverroute.service;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import com.silverroute.exception.RouteDataUnavailableException;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class OneMapAddressSearchTests {
    private final RestClient.Builder builder = RestClient.builder().baseUrl("https://www.onemap.gov.sg");
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    private final OneMapService service = spy(new OneMapService(builder.build()));
    private static final String MATCH = """
            {"results":[{"ADDRESS":"640 ROWELL ROAD SINGAPORE 200640",
            "LATITUDE":"1.3074","LONGITUDE":"103.8547"}]}
            """;

    private void expectSearch(String encoded, String response) {
        doReturn("test-token").when(service).getToken();
        server.expect(requestTo("https://www.onemap.gov.sg/api/common/elastic/search?searchVal="
                + encoded + "&returnGeom=Y&getAddrDetails=Y"))
                .andExpect(header("Authorization", "test-token"))
                .andRespond(withSuccess(response, MediaType.APPLICATION_JSON));
    }

    @Test void fullAddressUsesPostalCodeIncludingLeadingZero() throws Exception {
        expectSearch("10%20Example%20Road%2C%20%2312-34%2C%20Singapore%20012345", "{\"results\":[]}");
        expectSearch("012345", MATCH);
        assertThat(service.parseLocation(service.searchLocation(
                "10 Example Road, #12-34, Singapore 012345")).latitude()).isEqualTo(1.3074);
        server.verify();
    }

    @Test void removesUnitAndPunctuationAndFallsBackWithoutCountry() {
        expectSearch("640%20Rowell%20Road%2C%20%2301-02%2C%20Singapore", "{\"results\":[]}");
        expectSearch("640%20Rowell%20Road%20Singapore", "{\"results\":[]}");
        expectSearch("640%20Rowell%20Road", MATCH);
        assertThat(service.searchLocation(" 640 Rowell Road, #01-02, Singapore ")).isEqualTo(MATCH);
        server.verify();
    }

    @Test void specialCharactersStayInsideSearchParameter() {
        expectSearch("A%26B%20%2B%20%7BPlaza%7D", MATCH);
        assertThat(service.searchLocation("A&B + {Plaza}")).isEqualTo(MATCH);
        server.verify();
    }

    @Test void missingPostalCodeFallsBackToFullAddress() {
        expectSearch("640%20Rowell%20Road%2C%20200640", "{\"results\":[]}");
        expectSearch("200640", "{\"results\":[]}");
        expectSearch("640%20Rowell%20Road%20200640", MATCH);
        assertThat(service.searchLocation("640 Rowell Road, 200640")).isEqualTo(MATCH);
        server.verify();
    }

    @Test void noMatchesExplainHowToCorrectAddress() {
        expectSearch("Unknown%20Building", "{\"results\":[]}");
        assertThatThrownBy(() -> service.parseLocation(service.searchLocation("Unknown Building")))
                .isInstanceOf(RouteDataUnavailableException.class).hasMessageContaining("postal code");
        server.verify();
    }

    @Test void providerErrorsAreNotTreatedAsUnmatchedAddresses() {
        expectSearch("Hospital", "{\"error\":\"Token expired\"}");
        assertThatThrownBy(() -> service.searchLocation("Hospital")).isInstanceOf(IllegalStateException.class);
        server.verify();
    }

    @Test void originalAddressMatchPreventsPostalFallback() {
        expectSearch("640%20Rowell%20Road%2C%20200640", MATCH);
        assertThat(service.searchLocation("640 Rowell Road, 200640")).isEqualTo(MATCH);
        server.verify();
    }

    @Test void allDistinctMatchesAreReturnedForUserSelection() throws Exception {
        String second = "{\"ADDRESS\":\"SECOND BUILDING\",\"LATITUDE\":\"1.31\",\"LONGITUDE\":\"103.81\"}";
        String first = new com.fasterxml.jackson.databind.ObjectMapper().readTree(MATCH).path("results").get(0).toString();
        var matches = service.parseLocations("{\"results\":[" + first + "," + second + "," + first + "]}");
        assertThat(matches).hasSize(2);
        assertThat(matches).extracting(com.silverroute.api.LocationResult::name)
                .containsExactly("640 ROWELL ROAD SINGAPORE 200640", "SECOND BUILDING");
    }
}
