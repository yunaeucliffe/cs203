package com.silverroute;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.CookieManager;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.session.jdbc.JdbcIndexedSessionRepository;
import org.springframework.test.context.ActiveProfiles;

// Confirms sessions are stored in PostgreSQL (Spring Session JDBC) rather
// than in the application's own memory, which is what lets authentication
// survive a container being replaced or requests landing on a different
// instance.
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("mock")
class SessionPersistenceTests {

    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private JdbcIndexedSessionRepository sessionRepository;

    @Test
    void sessionRepositoryIsJdbcBacked() {
        assertThat(sessionRepository).isNotNull();
    }

    @Test
    void loginPersistsTheSessionInThePostgresSessionTable() throws Exception {
        HttpClient client = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();
        String base = "http://localhost:" + port;

        HttpResponse<String> csrfResponse = client.send(
                HttpRequest.newBuilder(URI.create(base + "/api/auth/csrf")).GET().build(),
                HttpResponse.BodyHandlers.ofString());
        String csrfToken = csrfResponse.body().replaceAll(".*\"token\":\"([^\"]+)\".*", "$1");

        long before = jdbcTemplate.queryForObject(
                "select count(*) from spring_session where principal_name = ?",
                Long.class, "mary@example.com");

        HttpResponse<String> loginResponse = client.send(
                HttpRequest.newBuilder(URI.create(base + "/api/auth/login"))
                        .header("Content-Type", "application/json")
                        .header("X-XSRF-TOKEN", csrfToken)
                        .POST(HttpRequest.BodyPublishers.ofString(
                                "{\"email\":\"mary@example.com\",\"password\":\"password123\"}"))
                        .build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(loginResponse.statusCode()).isEqualTo(200);

        long after = jdbcTemplate.queryForObject(
                "select count(*) from spring_session where principal_name = ?",
                Long.class, "mary@example.com");
        assertThat(after).isGreaterThan(before);
    }
}
