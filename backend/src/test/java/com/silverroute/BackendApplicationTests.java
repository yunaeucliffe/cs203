package com.silverroute;

import java.net.URI;
import java.net.http.*;
import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("mock")
class BackendApplicationTests {
    @LocalServerPort private int port;
    @Test void contextLoads() {}
    @Test void recommendationEndpointRequiresCsrf() throws Exception {
        var request=HttpRequest.newBuilder().uri(URI.create("http://localhost:"+port+"/api/route-recommendations"))
                .header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString("{}" )).build();
        var response=HttpClient.newHttpClient().send(request,HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).isEqualTo(403);
    }
}
