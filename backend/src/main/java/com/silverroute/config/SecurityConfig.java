package com.silverroute.config;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.silverroute.repository.UserRepository;

@Configuration
public class SecurityConfig {

    private static final String DEFAULT_ORIGIN = "http://localhost:5173";
    private static final String COMMA = "\\s*,\\s*";

    // Read from the Environment with defaults rather than injected placeholders: the security
    // tests build a plain context that does not load application.properties, and a frontend
    // served from the same origin as the API needs none of these settings changed.
    private final List<String> allowedOrigins;
    private final String sameSite;
    private final boolean secureCookies;

    SecurityConfig(Environment environment) {
        // A frontend deployed elsewhere (e.g. on Vercel without an API proxy) is a different
        // origin, so the origins allowed to call the API with credentials are configuration.
        this.allowedOrigins = List.of(environment
                .getProperty("app.cors.allowed-origins", DEFAULT_ORIGIN).split(COMMA));
        // Cross-site requests only carry the session and CSRF cookies when they are
        // SameSite=None; Secure, which in turn requires HTTPS on both sides.
        this.sameSite = environment.getProperty("server.servlet.session.cookie.same-site", "lax");
        this.secureCookies = environment
                .getProperty("server.servlet.session.cookie.secure", Boolean.class, false);
    }

    @Bean
    SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            SecurityContextRepository securityContextRepository,
            UserRepository userRepository) throws Exception {
        http
                .addFilterAfter(new DeletedAccountFilter(userRepository), SecurityContextHolderFilter.class)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfTokenRepository()))
                .securityContext(context -> context
                        .securityContextRepository(securityContextRepository))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/users/**", "/api/route-recommendations", "/api/route-recommendations/**", "/api/bus-arrival-estimates").authenticated()
                        .anyRequest().permitAll())
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, exception) ->
                                response.sendError(401, "Authentication required")))
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable);

        return http.build();
    }

    private CookieCsrfTokenRepository csrfTokenRepository() {
        CookieCsrfTokenRepository repository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        // The CSRF cookie has to follow the same rules as the session cookie, or a deployed
        // frontend is sent a token it cannot read back.
        repository.setCookieCustomizer(cookie -> cookie.sameSite(sameSite).secure(secureCookies));
        return repository;
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(allowedOrigins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Content-Type", "X-XSRF-TOKEN"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
