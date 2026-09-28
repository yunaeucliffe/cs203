package com.silverroute.routing;

import java.time.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;
import com.fasterxml.jackson.databind.*;
import org.springframework.stereotype.Component;

/** Bounded cache, including short-lived failures. Never serves expired evidence as current. */
@Component
public class EvidenceCache {
    public record Snapshot(JsonNode data, Instant retrievedAt, boolean available) {}
    private record Entry(Snapshot snapshot, Instant expiresAt) {}
    private final Map<String,Entry> cache = new ConcurrentHashMap<>();
    private final ObjectMapper mapper = new ObjectMapper();
    private final Clock clock;
    public EvidenceCache() { this(Clock.systemUTC()); }
    public EvidenceCache(Clock clock) { this.clock=clock; }
    public synchronized Snapshot get(String key, Duration ttl, Supplier<String> fetch) {
        Instant now=clock.instant();
        Entry current=cache.get(key);
        if (current!=null && current.expiresAt().isAfter(now)) return current.snapshot();
        Snapshot result;
        try {
            JsonNode data=mapper.readTree(fetch.get());
            if (data==null || data.isNull()) throw new IllegalArgumentException("Empty response");
            result=new Snapshot(data,clock.instant(),true);
        } catch (Exception exception) {
            result=new Snapshot(mapper.createObjectNode(),clock.instant(),false);
        }
        cache.entrySet().removeIf(e -> !e.getValue().expiresAt().isAfter(now));
        if (cache.size()>=1024) cache.remove(cache.keySet().iterator().next());
        cache.put(key,new Entry(result,result.retrievedAt().plus(result.available()?ttl:Duration.ofSeconds(60))));
        return result;
    }
}
