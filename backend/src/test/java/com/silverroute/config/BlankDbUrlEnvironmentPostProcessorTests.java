package com.silverroute.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.support.ResourcePropertySource;

// Resolves spring.datasource.url from the real application.properties, so a
// change to its placeholders is caught here rather than at deploy time.
class BlankDbUrlEnvironmentPostProcessorTests {

    private static StandardEnvironment environment(Map<String, Object> env) throws Exception {
        StandardEnvironment environment = new StandardEnvironment();
        // Isolate from the real process environment (which may define DB_URL).
        environment.getPropertySources().remove(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME);
        environment.getPropertySources().remove(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME);
        environment.getPropertySources().addLast(new MapPropertySource("env", env));
        environment.getPropertySources().addLast(
                new ResourcePropertySource(new ClassPathResource("application.properties")));
        new BlankDbUrlEnvironmentPostProcessor().postProcessEnvironment(environment, new SpringApplication());
        return environment;
    }

    @Test
    void blankDbUrlFallsBackToComposedUrl() throws Exception {
        StandardEnvironment env = environment(Map.of("DB_URL", "", "DB_NAME", "appdb"));
        assertThat(env.getProperty("spring.datasource.url"))
                .isEqualTo("jdbc:postgresql://[::1]:5432/appdb?connectTimeout=10&sslmode=disable");
    }

    @Test
    void whitespaceDbUrlFallsBackToComposedUrl() throws Exception {
        StandardEnvironment env = environment(Map.of("DB_URL", "   "));
        assertThat(env.getProperty("spring.datasource.url"))
                .isEqualTo("jdbc:postgresql://[::1]:5432/silverroute?connectTimeout=10&sslmode=disable");
    }

    @Test
    void unsetDbUrlUsesComposedUrl() throws Exception {
        StandardEnvironment env = environment(Map.of("DB_HOST", "db.internal", "DB_SSLMODE", "require"));
        assertThat(env.getProperty("spring.datasource.url"))
                .isEqualTo("jdbc:postgresql://db.internal:5432/silverroute?connectTimeout=10&sslmode=require");
        assertThat(env.getPropertySources().contains(BlankDbUrlEnvironmentPostProcessor.PROPERTY_SOURCE_NAME)).isFalse();
    }

    @Test
    void explicitDbUrlWins() throws Exception {
        StandardEnvironment env = environment(Map.of("DB_URL", "jdbc:postgresql://db.example.com:5432/prod?sslmode=require"));
        assertThat(env.getProperty("spring.datasource.url"))
                .isEqualTo("jdbc:postgresql://db.example.com:5432/prod?sslmode=require");
    }
}
