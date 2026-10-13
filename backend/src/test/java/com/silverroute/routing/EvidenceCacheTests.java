package com.silverroute.routing;

import java.time.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class EvidenceCacheTests {
    @Test void busFailureExpiresAtTwentySecondsAndAllowsRecovery() {
        var clock = new MutableClock();
        var cache = new EvidenceCache(clock);
        var calls = new AtomicInteger();
        java.util.function.Supplier<String> loader = () -> {
            if (calls.incrementAndGet() == 1) throw new IllegalStateException("LTA timeout");
            return "{}";
        };
        assertThat(cache.get("bus:01234", Duration.ofSeconds(20), loader).available()).isFalse();
        clock.now = clock.now.plusSeconds(19);
        assertThat(cache.get("bus:01234", Duration.ofSeconds(20), loader).available()).isFalse();
        assertThat(calls.get()).isEqualTo(1);
        clock.now = clock.now.plusSeconds(1);
        assertThat(cache.get("bus:01234", Duration.ofSeconds(20), loader).available()).isTrue();
        assertThat(calls.get()).isEqualTo(2);
        clock.now = clock.now.plusSeconds(19);
        assertThat(cache.get("bus:01234", Duration.ofSeconds(20), loader).available()).isTrue();
        assertThat(calls.get()).isEqualTo(2);
    }
    private static class MutableClock extends Clock {
        Instant now=Instant.parse("2026-09-28T00:00:00Z");
        public ZoneId getZone() { return ZoneOffset.UTC; }
        public Clock withZone(ZoneId zone) { return this; }
        public Instant instant() { return now; }
    }
    @Test void separatesLiveAndReferenceTtlAndCachesFailuresBriefly() {
        var clock=new MutableClock(); var cache=new EvidenceCache(clock); var count=new AtomicInteger();
        java.util.function.Supplier<String> loader=() -> { count.incrementAndGet(); return "{}"; };
        cache.get("live",Duration.ofSeconds(60),loader); cache.get("reference",Duration.ofHours(24),loader);
        clock.now=clock.now.plusSeconds(61);
        cache.get("live",Duration.ofSeconds(60),loader); cache.get("reference",Duration.ofHours(24),loader);
        assertThat(count.get()).isEqualTo(3);
        clock.now=clock.now.plus(Duration.ofHours(24)); cache.get("reference",Duration.ofHours(24),loader);
        assertThat(count.get()).isEqualTo(4);
        var failed=cache.get("failure",Duration.ofHours(24),() -> { throw new IllegalStateException(); });
        assertThat(failed.available()).isFalse();
        assertThat(cache.get("failure",Duration.ofHours(24),loader).available()).isFalse();
        clock.now=clock.now.plusSeconds(61);
        assertThat(cache.get("failure",Duration.ofHours(24),loader).available()).isTrue();
    }
}
