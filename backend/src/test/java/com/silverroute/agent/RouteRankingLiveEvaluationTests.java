package com.silverroute.agent;

import java.nio.file.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.silverroute.routing.*;

/** Explicit opt-in: paid model quality evaluation, separate from deterministic contract tests. */
@EnabledIfEnvironmentVariable(named="RUN_OPENAI_EVAL",matches="true")
class RouteRankingLiveEvaluationTests {
    @Test void evaluateSavedPreferenceScenarios() throws Exception {
        String key=System.getenv("OPENAI_API_KEY"),model=System.getenv("OPENAI_MODEL");
        assertThat(key).as("Export OPENAI_API_KEY for paid live evaluation").isNotBlank();
        assertThat(model).as("Export OPENAI_MODEL for paid live evaluation").isNotBlank();
        var gateway=new OpenAiModelGateway(key,model);
        List<Map<String,Object>> report=new ArrayList<>();
        var lowWalking=new RouteContext(TestRoutes.trip().context().trip(),new SavedPreferences("Slow","Poor",false),
                List.of(candidate("short-walk",30,2,100.0,null),candidate("fast",27,15,1100.0,null),candidate("middle",32,8,600.0,null)),
                List.of("All accessibility and shelter are unknown; these are synthetic evaluation routes"));
        var preferShelter=new RouteContext(TestRoutes.trip().context().trip(),new SavedPreferences("Normal","Moderate",true),
                List.of(candidate("covered",30,5,300.0,280.0),candidate("exposed",30,5,300.0,10.0),candidate("partial",30,5,300.0,100.0)),
                List.of("Shelter is estimated geometric overlap, accessibility unknown; synthetic evaluation routes"));
        var missingEvidence=new RouteContext(TestRoutes.trip().context().trip(),new SavedPreferences("Normal","Moderate",true),
                List.of(candidate("unknown-data",30,5,300.0,null)),List.of("Shelter and accessibility could not be verified"));
        for(var scenario:List.of(lowWalking,preferShelter,missingEvidence)) {
            var result=gateway.rank(scenario);
            report.add(Map.of("model",model,"context",scenario,"result",result));
        }
        Files.createDirectories(Path.of("target"));
        new ObjectMapper().writerWithDefaultPrettyPrinter().writeValue(Path.of("target/route-ranking-evaluation.json").toFile(),report);
        assertThat(((RankingResult)report.get(0).get("result")).rankings().getFirst().routeId()).isEqualTo("short-walk");
        assertThat(((RankingResult)report.get(1).get("result")).rankings().getFirst().routeId()).isEqualTo("covered");
        assertThat(((RankingResult)report.get(2).get("result")).rankings()).hasSize(1);
        // Review factual grounding and uncertainty in the report; JSON compliance does not prove prose correctness.
    }
    private RouteContext.Candidate candidate(String id,int duration,int walking,Double distance,Double sheltered) {
        return new RouteContext.Candidate(id,"Synthetic public transport route",duration,walking,distance,0,"unknown",sheltered,List.of(),List.of());
    }
}
