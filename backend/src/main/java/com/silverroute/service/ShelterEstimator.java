package com.silverroute.service;

import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.geotools.referencing.CRS;
import org.geotools.geometry.jts.JTS;
import org.geotools.api.referencing.operation.MathTransform;
import org.locationtech.jts.geom.*;
import org.locationtech.jts.index.strtree.STRtree;
import org.locationtech.jts.operation.union.UnaryUnionOp;
import com.fasterxml.jackson.databind.JsonNode;
import com.silverroute.api.RouteOption;
import com.silverroute.routing.*;

@Service
public class ShelterEstimator {
    public record Estimate(Double meters, RouteEvidence evidence) {}
    private final CoveredLinkwayService covered;
    private final EvidenceCache cache;
    private final double tolerance;
    private final GeometryFactory geometry = new GeometryFactory();
    private EvidenceCache.Snapshot indexedSnapshot;
    private STRtree index;
    private MathTransform projection;

    public ShelterEstimator(CoveredLinkwayService covered, EvidenceCache cache,
            @Value("${routing.shelter-tolerance-meters:10}") double tolerance) {
        if (!Double.isFinite(tolerance) || tolerance<=0 || tolerance>100)
            throw new IllegalArgumentException("Shelter tolerance must be between 0 and 100 metres");
        this.covered=covered; this.cache=cache; this.tolerance=tolerance;
    }

    public synchronized Estimate estimate(RouteOption route) {
        var walks=route.legs().stream().filter(l -> "WALK".equals(l.mode())).toList();
        if (walks.isEmpty() || walks.stream().anyMatch(l -> l.path().size()<2))
            return unavailable(null,"Walking geometry is unavailable");
        var snapshot=cache.get("covered-linkways",Duration.ofHours(24),() -> {
            try { return covered.getGeoJson(); } catch (Exception e) { throw new IllegalStateException(e); }
        });
        if (!snapshot.available()) return unavailable(snapshot,"Covered linkway data is unavailable");
        try {
            ensureIndex(snapshot);
            double sheltered=0;
            for (var leg:walks) {
                Coordinate[] coordinates=leg.path().stream().map(p -> new Coordinate(p.get(1),p.get(0))).toArray(Coordinate[]::new);
                Geometry walk=JTS.transform(geometry.createLineString(coordinates),projection);
                if (walk.getLength()==0) continue;
                Envelope search=new Envelope(walk.getEnvelopeInternal()); search.expandBy(tolerance);
                List<Geometry> nearby=new ArrayList<>();
                for (Object item:index.query(search)) nearby.add(((Geometry)item).buffer(tolerance));
                if (!nearby.isEmpty()) sheltered+=walk.intersection(UnaryUnionOp.union(nearby)).getLength();
            }
            if (route.walkingDistanceMeters()!=null) sheltered=Math.min(sheltered,route.walkingDistanceMeters());
            double meters=Math.round(sheltered*10)/10.0;
            return new Estimate(meters,new RouteEvidence("LTA CoveredLinkWay",null,snapshot.retrievedAt().toString(),
                    "available",Map.of("estimatedShelteredWalkingMeters",meters,"matchingToleranceMeters",tolerance,
                    "method","Walking geometry overlap with buffered linkways in EPSG:3414; estimate, not verified shelter")));
        } catch (Exception e) { return unavailable(snapshot,"Shelter overlap could not be calculated"); }
    }

    private Estimate unavailable(EvidenceCache.Snapshot snapshot,String reason) {
        return new Estimate(null,new RouteEvidence("LTA CoveredLinkWay",null,
                snapshot==null?null:snapshot.retrievedAt().toString(),"unavailable",Map.of("reason",reason)));
    }
    private void ensureIndex(EvidenceCache.Snapshot snapshot) throws Exception {
        if (snapshot==indexedSnapshot && index!=null) return;
        JsonNode features=snapshot.data().path("features");
        if (!features.isArray() || features.isEmpty()) throw new IllegalArgumentException("No linkway features");
        if (projection==null) projection=new org.geotools.referencing.operation.DefaultCoordinateOperationFactory(
                new org.geotools.util.factory.Hints(org.geotools.util.factory.Hints.LENIENT_DATUM_SHIFT,true))
                .createOperation(CRS.decode("EPSG:4326",true),CRS.decode("EPSG:3414",true)).getMathTransform();
        STRtree replacement=new STRtree(); int count=0;
        for (JsonNode feature:features) {
            for (Geometry shape:readGeometry(feature.path("geometry"))) {
                Geometry projected=JTS.transform(shape,projection);
                replacement.insert(projected.getEnvelopeInternal(),projected); count++;
            }
        }
        if (count==0) throw new IllegalArgumentException("No usable linkway lines or polygons");
        replacement.build(); index=replacement; indexedSnapshot=snapshot;
    }
    private List<Geometry> readGeometry(JsonNode node) {
        JsonNode c=node.path("coordinates");
        return switch(node.path("type").asText()) {
            case "LineString" -> List.of(geometry.createLineString(coordinates(c)));
            case "Polygon" -> List.of(polygon(c));
            case "MultiLineString", "MultiPolygon" -> {
                List<Geometry> parts=new ArrayList<>();
                for (JsonNode part:c) parts.add(node.path("type").asText().equals("MultiLineString")
                        ?geometry.createLineString(coordinates(part)):polygon(part));
                yield parts;
            }
            case "GeometryCollection" -> {
                List<Geometry> parts=new ArrayList<>();
                for (JsonNode part:node.path("geometries")) parts.addAll(readGeometry(part));
                yield parts;
            }
            default -> List.of();
        };
    }
    private Polygon polygon(JsonNode rings) {
        LinearRing shell=geometry.createLinearRing(coordinates(rings.path(0)));
        LinearRing[] holes=new LinearRing[Math.max(0,rings.size()-1)];
        for(int i=1;i<rings.size();i++) holes[i-1]=geometry.createLinearRing(coordinates(rings.get(i)));
        return geometry.createPolygon(shell,holes);
    }
    private Coordinate[] coordinates(JsonNode values) {
        List<Coordinate> points=new ArrayList<>();
        for(JsonNode pair:values) {
            if(!pair.isArray() || pair.size()<2 || !pair.get(0).isNumber() || !pair.get(1).isNumber())
                throw new IllegalArgumentException("Invalid linkway coordinate");
            double lon=pair.get(0).doubleValue(),lat=pair.get(1).doubleValue();
            if(!Double.isFinite(lon)||!Double.isFinite(lat)||Math.abs(lon)>180||Math.abs(lat)>90)
                throw new IllegalArgumentException("Invalid linkway coordinate");
            points.add(new Coordinate(lon,lat));
        }
        return points.toArray(Coordinate[]::new);
    }
}
