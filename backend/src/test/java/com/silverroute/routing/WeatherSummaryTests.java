package com.silverroute.routing;

import java.util.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class WeatherSummaryTests {
    private RouteEvidence reading(String source, String key, Object value, String availability) {
        return new RouteEvidence(source, "2026-09-28T00:00:00Z", "2026-09-28T00:00:00Z",
                availability, Map.of("observations", List.of(Map.of(key, value))));
    }
    private WeatherSummary summary(double temperature, double rain, double threshold) {
        return WeatherSummary.from(List.of(reading("NEA Air Temperature", "temperatureCelsius", temperature, "available"),
                reading("NEA Rainfall", "rainfallMm", rain, "available")), 300.0, 200.0, threshold);
    }
    @Test void defaultHeatThresholdIs33DegreesInclusive() {
        assertThat(WeatherSummary.DEFAULT_HEAT_THRESHOLD).isEqualTo(33);
        assertThat(summary(32.9, 0, WeatherSummary.DEFAULT_HEAT_THRESHOLD).hot()).isFalse();
        assertThat(summary(33, 0, WeatherSummary.DEFAULT_HEAT_THRESHOLD).hot()).isTrue();
        assertThat(summary(33.1, 0, WeatherSummary.DEFAULT_HEAT_THRESHOLD).hot()).isTrue();
    }
    @Test void thresholdAndRainBoundaries() {
        assertThat(summary(29.9, 0, 30).hot()).isFalse();
        assertThat(summary(30, 0, 30).hot()).isTrue();
        assertThat(summary(30.1, 0, 30).hot()).isTrue();
        assertThat(summary(30, 0, 30).raining()).isFalse();
        var both = summary(31, 0.1, 30);
        assertThat(both.hot()).isTrue();
        assertThat(both.raining()).isTrue();
        assertThat(both.estimatedUnshelteredWalkingMeters()).isEqualTo(100);
        assertThat(summary(31, 0, 32).hot()).isFalse();
    }
    @Test void absentInvalidAndUnavailableReadingsStayUnknown() {
        var evidence = List.of(reading("NEA Air Temperature", "temperatureCelsius", 40, "unavailable"),
                reading("NEA Air Temperature", "temperatureCelsius", Double.NaN, "available"),
                reading("NEA Rainfall", "rainfallMm", -1, "available"),
                reading("NEA Rainfall", "rainfallMm", "10", "available"));
        var summary = WeatherSummary.from(evidence, 300.0, null, 30);
        assertThat(summary.hot()).isNull();
        assertThat(summary.raining()).isNull();
        assertThat(summary.maxTemperatureCelsius()).isNull();
        assertThat(summary.maxRainfallMm()).isNull();
        assertThat(summary.estimatedUnshelteredWalkingMeters()).isNull();
    }
    @Test void usesHighestValidMatchedObservation() {
        var summary = WeatherSummary.from(List.of(
                reading("NEA Air Temperature", "temperatureCelsius", 28, "available"),
                reading("NEA Air Temperature", "temperatureCelsius", 31, "available"),
                reading("Other", "temperatureCelsius", 40, "available")), 100.0, 0.0, 30);
        assertThat(summary.maxTemperatureCelsius()).isEqualTo(31);
        assertThat(summary.estimatedUnshelteredWalkingMeters()).isEqualTo(100);
    }
    @Test void exposureIsBoundedAndMissingDistancesStayUnknown() {
        assertThat(WeatherSummary.from(List.of(), 100.0, 150.0, 30).estimatedUnshelteredWalkingMeters()).isZero();
        assertThat(WeatherSummary.from(List.of(), 0.0, 0.0, 30).estimatedUnshelteredWalkingMeters()).isZero();
        assertThat(WeatherSummary.from(List.of(), 0.0, null, 30).estimatedUnshelteredWalkingMeters()).isNull();
        assertThat(WeatherSummary.from(List.of(), null, 20.0, 30).estimatedUnshelteredWalkingMeters()).isNull();
        assertThat(WeatherSummary.from(List.of(), 100.0, -1.0, 30).estimatedUnshelteredWalkingMeters()).isNull();
    }
}
