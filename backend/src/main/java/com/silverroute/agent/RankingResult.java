package com.silverroute.agent;

import java.util.List;

public record RankingResult(List<Selection> rankings) {
    public record Selection(String routeId, List<String> reasons, List<String> warnings) {}
}
