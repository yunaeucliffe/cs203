package com.silverroute;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class BackendApplicationTests {

	@LocalServerPort
	private int port;

	@Test
	void contextLoads() {
	}

	@Test
	void healthEndpointShouldReturnServiceStatus() throws Exception {
		HttpClient client = HttpClient.newHttpClient();
		HttpRequest request = HttpRequest.newBuilder()
				.uri(URI.create("http://localhost:" + port + "/api/health"))
				.build();

		HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

		assertThat(response.statusCode()).isEqualTo(200);
		assertThat(response.body()).contains("status").contains("ok");
	}

	@Test
	void recommendationEndpointShouldReturnAgentRecommendation() throws Exception {
		String requestBody = """
				{
				  "origin": "Jurong East MRT",
				  "destination": "National University Hospital",
				  "departureTime": "2026-09-14T14:00:00+08:00",
				  "preferences": {
				    "maxWalkingMinutes": 10,
				    "wheelchairAccessible": true,
				    "minimizeTransfers": true
				  }
				}
				""";

		HttpResponse<String> response = post("/api/route-recommendations", requestBody);

		assertThat(response.statusCode()).isEqualTo(200);
		assertThat(response.headers().firstValue("X-Request-Id")).isPresent();
		assertThat(response.body())
				.contains("\"recommendedRoute\"")
				.contains("\"id\":\"route-1\"")
				.contains("\"alternatives\"")
				.contains("\"sources\":[\"mock-route-data\"]")
				.contains("\"engine\":\"mock-agent-v1\"");
	}

	@Test
	void recommendationEndpointShouldRejectInvalidInput() throws Exception {
		String requestBody = """
				{
				  "origin": "",
				  "destination": "National University Hospital",
				  "departureTime": "2026-09-14T14:00:00+08:00",
				  "preferences": {
				    "maxWalkingMinutes": -1,
				    "wheelchairAccessible": true,
				    "minimizeTransfers": true
				  }
				}
				""";

		HttpResponse<String> response = post("/api/route-recommendations", requestBody);

		assertThat(response.statusCode()).isEqualTo(400);
		assertThat(response.body())
				.contains("\"status\":400")
				.contains("\"message\"")
				.contains("\"requestId\"")
				.contains("\"timestamp\"");
	}

	private HttpResponse<String> post(String path, String body) throws Exception {
		HttpClient client = HttpClient.newHttpClient();
		HttpRequest request = HttpRequest.newBuilder()
				.uri(URI.create("http://localhost:" + port + path))
				.header("Content-Type", "application/json")
				.POST(HttpRequest.BodyPublishers.ofString(body))
				.build();
		return client.send(request, HttpResponse.BodyHandlers.ofString());
	}

}
