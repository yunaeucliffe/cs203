package com.silverroute.routing;

import java.nio.charset.StandardCharsets;
import java.util.*;
import com.silverroute.api.*;

public final class TestRoutes {
    public static String fixture(String name) throws Exception {
        try(var input=TestRoutes.class.getResourceAsStream("/routes/"+name+".json")) {
            return new String(Objects.requireNonNull(input).readAllBytes(),StandardCharsets.UTF_8);
        }
    }
    public static RouteOption route() throws Exception { return new RouteParser().parse(fixture("onemap")).getFirst(); }
    public static AggregatedTrip trip() throws Exception {
        var route=route();
        var context=new RouteContext(new RouteContext.Trip("Origin","Destination","2026-09-28T08:00:00+08:00"),
                new SavedPreferences("Slow","Poor",true),List.of(RouteContext.Candidate.from(route)),List.of("Some evidence is unavailable"));
        return new AggregatedTrip(context,List.of(route),List.of("onemap-route-data"));
    }
}
