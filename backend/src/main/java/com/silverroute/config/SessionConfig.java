package com.silverroute.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.session.config.annotation.web.http.SpringHttpSessionConfiguration;
import org.springframework.session.jdbc.config.annotation.web.http.EnableJdbcHttpSession;

// This Spring Boot version does not ship an auto-configuration that wires
// Spring Session from spring.session.* properties, so it is enabled
// explicitly. @EnableJdbcHttpSession only registers the JDBC-backed
// SessionRepository; SpringHttpSessionConfiguration supplies the servlet
// filter that actually swaps HttpSession for it. Defaults (SPRING_SESSION
// table, 1800s/30m timeout, once-a-minute cleanup) already match this
// project's schema and server.servlet.session.timeout.
@Configuration
@EnableJdbcHttpSession
@Import(SpringHttpSessionConfiguration.class)
public class SessionConfig {
}
