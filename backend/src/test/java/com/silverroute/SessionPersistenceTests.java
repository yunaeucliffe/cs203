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
        // Create our own account rather than relying on seed data: CI applies
        // only database/schema.sql, not database/mockdata.sql.
        String suffix = java.util.UUID.randomUUID().toString().substring(0, 8);
        String email = "session-test-" + suffix + "@example.com";
        String password = "password123";
        String base = "http://localhost:" + port;
        try {
            HttpClient signUpClient = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();
            HttpResponse<String> signUpResponse = signUpClient.send(
                    jsonPost(base + "/api/auth/signup", csrfToken(signUpClient, base),
                            "{\"name\":\"Session Test\",\"username\":\"session-test-" + suffix
                                    + "\",\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"),
                    HttpResponse.BodyHandlers.ofString());
            assertThat(signUpResponse.statusCode()).isEqualTo(201);

            long before = sessionCount(email);

            // A fresh client has no session, so this login must create a new stored one.
            HttpClient client = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();
            HttpResponse<String> loginResponse = client.send(
                    jsonPost(base + "/api/auth/login", csrfToken(client, base),
                            "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"),
                    HttpResponse.BodyHandlers.ofString());
            assertThat(loginResponse.statusCode()).isEqualTo(200);

            assertThat(sessionCount(email)).isGreaterThan(before);
        } finally {
            jdbcTemplate.update("delete from spring_session where principal_name = ?", email);
            jdbcTemplate.update("delete from users where email = ?", email);
        }
    }

    private long sessionCount(String email) {
        return jdbcTemplate.queryForObject(
                "select count(*) from spring_session where principal_name = ?", Long.class, email);
    }

    private static String csrfToken(HttpClient client, String base) throws Exception {
        HttpResponse<String> response = client.send(
                HttpRequest.newBuilder(URI.create(base + "/api/auth/csrf")).GET().build(),
                HttpResponse.BodyHandlers.ofString());
        return response.body().replaceAll(".*\"token\":\"([^\"]+)\".*", "$1");
    }

    private static HttpRequest jsonPost(String url, String csrfToken, String body) {
        return HttpRequest.newBuilder(URI.create(url))
                .header("Content-Type", "application/json")
                .header("X-XSRF-TOKEN", csrfToken)
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
    }
}
