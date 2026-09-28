package com.silverroute.agent;

import java.util.Comparator;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import com.silverroute.routing.RouteContext;

@Component
@Profile("mock")
public class MockModelGateway implements ModelGateway {
    @Override public String engine() { return "mock-agent-v2"; }
    @Override public RankingResult rank(RouteContext context) {
        return new RankingResult(context.candidates().stream()
                .sorted(Comparator.comparing(RouteContext.Candidate::walkingMinutes,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .limit(3).map(route -> new RankingResult.Selection(route.id(),
                        List.of("Demo ranking by walking time"), List.of("Mock data; not for navigation"))).toList());
    }
}
