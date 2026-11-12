package com.silverroute.config;

import java.util.Map;

import org.springframework.boot.EnvironmentPostProcessor;
import org.springframework.boot.SpringApplication;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.util.StringUtils;

/**
 * Treats a blank {@code DB_URL} as unset.
 *
 * <p>{@code spring.datasource.url=${DB_URL:<composed>}} only falls back when
 * {@code DB_URL} is absent; Spring substitutes an empty string when it is
 * present but blank (e.g. {@code DB_URL=} copied from an env template), which
 * leaves the datasource with no JDBC URL and startup fails. When that happens
 * this pins {@code spring.datasource.url} back to the URL composed from
 * {@code DB_HOST}/{@code DB_NAME}/{@code DB_SSLMODE}.
 *
 * <p>Runs after config data (application.properties and the imported
 * {@code .env}) has been loaded, so it sees every source of {@code DB_URL}.
 */
public class BlankDbUrlEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    static final String PROPERTY_SOURCE_NAME = "blankDbUrlFallback";
    static final String COMPOSED_URL_PROPERTY = "silverroute.datasource.composed-url";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        if (StringUtils.hasText(environment.getProperty("spring.datasource.url"))) {
            return; // DB_URL is set, absent (placeholder default applied) or overridden elsewhere
        }
        environment.getPropertySources().addFirst(new MapPropertySource(PROPERTY_SOURCE_NAME,
                Map.of("spring.datasource.url", "${" + COMPOSED_URL_PROPERTY + "}")));
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }
}
