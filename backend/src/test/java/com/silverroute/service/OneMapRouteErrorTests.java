package com.silverroute.service;

import static org.assertj.core.api.Assertions.*;
import static org.hamcrest.Matchers.startsWith;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

import java.time.OffsetDateTime;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestClient;

import com.silverroute.exception.InvalidAddressException;
import com.silverroute.exception.RouteDataUnavailableException;

class OneMapRouteErrorTests {
    private final RestClient.Builder builder = RestClient.builder().baseUrl("https://www.onemap.gov.sg");
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    private final OneMapService service = spy(new OneMapService(builder.build()));
    private static final OffsetDateTime NIGHT = OffsetDateTime.parse("2026-10-24T00:35:00+08:00");
    private static final OffsetDateTime MORNING = OffsetDateTime.parse("2026-10-24T09:00:00+08:00");

    @BeforeEach void token() {
        doReturn("test-token").when(service).getToken();
    }

    private void oneMapReplies(HttpStatus status, String error) {
        server.expect(requestTo(startsWith("https://www.onemap.gov.sg/api/public/routingsvc/route")))
                .andRespond(withStatus(status).contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":\"" + error + "\"}"));
    }

    private void getRoute(OffsetDateTime departure) {
        // Heart of Yew Tee to SMU Connexion
        service.getRoute(1.3974, 103.7461, 1.2956, 103.8493, departure);
    }

    @Test void noRouteAtNightExplainsServicesHaveStopped() {
        oneMapReplies(HttpStatus.NOT_FOUND, "No route found between the specified locations");
        assertThatThrownBy(() -> getRoute(NIGHT))
                .isInstanceOf(RouteDataUnavailableException.class)
                .hasMessageContaining("stopped for the night")
                .hasMessageContaining("after 5:30 am")
                .hasMessageNotContaining("OneMap");
        server.verify();
    }

    @Test void noRouteInTheDaySuggestsWhatToTryNext() {
        oneMapReplies(HttpStatus.NOT_FOUND, "No route found between the specified locations");
        assertThatThrownBy(() -> getRoute(MORNING))
                .isInstanceOf(RouteDataUnavailableException.class)
                .hasMessageContaining("No public transport routes are available")
                .hasMessageContaining("different starting point or destination")
                .hasMessageNotContaining("night");
        server.verify();
    }

    @Test void placeOutsideSingaporeAsksForPlacesInSingapore() {
        oneMapReplies(HttpStatus.BAD_REQUEST, "Coordinates are outside Singapore's valid range.");
        assertThatThrownBy(() -> getRoute(MORNING))
                .isInstanceOf(InvalidAddressException.class)
                .hasMessageContaining("outside Singapore")
                .hasMessageContaining("Choose places in Singapore");
        server.verify();
    }

    @Test void oneMapOutageIsLeftForTheGeneralUnavailableMessage() {
        oneMapReplies(HttpStatus.INTERNAL_SERVER_ERROR, "Internal error");
        assertThatThrownBy(() -> getRoute(MORNING)).isInstanceOf(HttpServerErrorException.class);
        server.verify();
    }

    @Test void nightHintUsesSingaporeTimeEvenForUtcDepartures() {
        // 16:35 UTC is 00:35 the next day in Singapore.
        assertThat(OneMapService.noRouteMessage(OffsetDateTime.parse("2026-10-23T16:35:00Z")))
                .contains("stopped for the night");
        assertThat(OneMapService.noRouteMessage(OffsetDateTime.parse("2026-10-23T21:31:00Z")))
                .doesNotContain("night");
    }
}
