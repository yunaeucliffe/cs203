package com.silverroute.service;

import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.silverroute.routing.*;

class ShelterEstimatorTests {
    @Test void unionAvoidsDoubleCountingAndMissingGeometryRemainsUnknown() throws Exception {
        var covered=mock(CoveredLinkwayService.class);
        var mapper=new com.fasterxml.jackson.databind.ObjectMapper();
        var json=mapper.readTree(TestRoutes.fixture("linkways"));
        var features=(com.fasterxml.jackson.databind.node.ArrayNode)json.get("features"); features.add(features.get(0).deepCopy());
        when(covered.getGeoJson()).thenReturn(json.toString());
        var estimator=new ShelterEstimator(covered,new EvidenceCache(),10);
        assertThat(estimator.estimate(TestRoutes.route()).meters()).isBetween(10.0,12.0);
        var route=TestRoutes.route();
        var invalid=new com.silverroute.api.RouteOption(route.id(),route.summary(),23,3,0,"unknown",22.0,null,null,
                List.of(new RouteLeg("WALK",null,route.legs().getFirst().from(),route.legs().getFirst().to(),60.0,22.0,null,null,List.of())),
                List.of(),List.of(),List.of(),List.of());
        assertThat(estimator.estimate(invalid).meters()).isNull();
    }
    @Test void emptyLinkwayDatasetIsUnavailableNotZeroCoverage() throws Exception {
        var covered=mock(CoveredLinkwayService.class); when(covered.getGeoJson()).thenReturn("{\"features\":[]}");
        assertThat(new ShelterEstimator(covered,new EvidenceCache(),10).estimate(TestRoutes.route()).meters()).isNull();
    }
}
