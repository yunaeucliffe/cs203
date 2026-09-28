package com.silverroute.service;

import java.time.*;
import java.util.*;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.*;
import com.silverroute.api.RouteOption;
import com.silverroute.routing.*;
import static com.silverroute.routing.RouteParser.text;

@Service
public class RouteEnrichmentService {
    private static final Duration LIVE=Duration.ofSeconds(60), REFERENCE=Duration.ofHours(24);
    private static final Pattern STATION=Pattern.compile("(?<![A-Z0-9])(?:NS|EW|CG|NE|CC|CE|DT|TE|BP|SE|SW|PE|PW)[0-9]{1,2}(?![A-Z0-9])");
    private final LtaDataMallService lta;
    private final WeatherService weather;
    private final EvidenceCache cache;
    private final ShelterEstimator shelter;
    private final Clock clock;
    private final ObjectMapper mapper=new ObjectMapper();

    @org.springframework.beans.factory.annotation.Autowired
    public RouteEnrichmentService(LtaDataMallService lta, WeatherService weather, EvidenceCache cache, ShelterEstimator shelter) {
        this(lta,weather,cache,shelter,Clock.systemUTC());
    }
    public RouteEnrichmentService(LtaDataMallService lta, WeatherService weather, EvidenceCache cache, ShelterEstimator shelter, Clock clock) {
        this.lta=lta; this.weather=weather; this.cache=cache; this.shelter=shelter; this.clock=clock;
    }

    public RouteOption enrich(RouteOption route, boolean live, Map<String,EvidenceCache.Snapshot> requestCache) {
        List<RouteEvidence> evidence=new ArrayList<>();
        List<String> warnings=new ArrayList<>(route.warnings());
        Set<String> buses=new HashSet<>(), stations=new LinkedHashSet<>(), names=new LinkedHashSet<>(), lines=new LinkedHashSet<>();
        for(var leg:route.legs()) {
            if("BUS".equals(leg.mode()) && live) {
                String code=busStopCode(leg.from(),requestCache);
                String service=leg.service();
                if(code==null || service==null) {
                    warnings.add("Bus arrival matching is unavailable for a route leg.");
                    evidence.add(unavailable("LTA BusArrival",null,"Bus stop or service could not be matched"));
                } else if(buses.add(code+":"+service)) {
                    var snapshot=fetch(requestCache,"bus:"+code,LIVE,() -> lta.getBusArrivals(code));
                    evidence.add(busEvidence(snapshot,code,service));
                }
            }
            if(isRail(leg.mode())) {
                Set<String> fromCodes=stationCodes(leg.from()),toCodes=stationCodes(leg.to());
                if(leg.from().name()!=null) names.add(normalName(leg.from().name()));
                if(leg.to().name()!=null) names.add(normalName(leg.to().name()));
                String matchedLine=serviceLine(leg.service());
                if(matchedLine==null) {
                    Set<String> common=new LinkedHashSet<>();
                    fromCodes.stream().map(this::stationLine).filter(Objects::nonNull).forEach(common::add);
                    common.retainAll(toCodes.stream().map(this::stationLine).toList());
                    if(common.size()==1) matchedLine=common.iterator().next();
                }
                if(matchedLine!=null) {
                    lines.add(matchedLine);
                    // Interchanges expose several line codes; keep only the line actually used by this leg.
                    final String usedLine=matchedLine;
                    java.util.stream.Stream.concat(fromCodes.stream(),toCodes.stream())
                            .filter(code -> usedLine.equals(stationLine(code))).forEach(stations::add);
                } else warnings.add("The train line for a route leg could not be matched.");
            }
        }
        boolean rail=route.legs().stream().anyMatch(l -> isRail(l.mode()));
        if(rail) {
            var maintenance=fetch(requestCache,"facilities",LIVE,lta::getFacilitiesMaintenance);
            evidence.add(facilities(maintenance,stations,names));
            var alerts=fetch(requestCache,"train-alerts",LIVE,lta::getTrainServiceAlerts);
            evidence.add(alerts(alerts,lines));
            if(live) {
                Set<String> crowdLines=new LinkedHashSet<>();
                stations.stream().map(this::crowdLine).filter(Objects::nonNull).forEach(crowdLines::add);
                for(String line:crowdLines) {
                    var density=fetch(requestCache,"crowd:"+line,LIVE,() -> lta.getStationCrowdDensity(line));
                    evidence.add(crowding(density,stations,line));
                }
                if(stations.isEmpty() || lines.isEmpty()) evidence.add(unavailable("LTA PCDRealTime",null,"Station codes could not be matched"));
            }
        }
        if(live && route.legs().stream().anyMatch(l -> "WALK".equals(l.mode()))) {
            var rainfall=fetch(requestCache,"rainfall",LIVE,weather::getRainfall);
            evidence.add(rainfall(rainfall,route));
        }
        var estimate=shelter.estimate(route);
        evidence.add(estimate.evidence());
        for(var item:evidence) if(!"available".equals(item.availability()))
            warnings.add(item.source()+": "+item.details().getOrDefault("reason","Evidence is unavailable"));
        return route.enrich(estimate.meters(),List.copyOf(evidence),List.copyOf(new LinkedHashSet<>(warnings)));
    }

    private EvidenceCache.Snapshot fetch(Map<String,EvidenceCache.Snapshot> local,String key,Duration ttl,java.util.function.Supplier<String> loader) {
        return local.computeIfAbsent(key,k -> cache.get(k,ttl,loader));
    }

    private String busStopCode(RouteLeg.Stop stop,Map<String,EvidenceCache.Snapshot> local) {
        for(String value:Arrays.asList(stop.code(),stop.id())) {
            if(value==null) continue;
            String suffix=value.substring(value.lastIndexOf(':')+1);
            if(suffix.matches("[0-9]{5}")) return suffix;
        }
        // Exact unique name plus nearby coordinates; never guess a stop from proximity alone.
        if(stop.name()==null || stop.latitude()==null || stop.longitude()==null) return null;
        var stops=fetch(local,"bus-stops",REFERENCE,() -> {
            var all=mapper.createArrayNode();
            for(int skip=0;skip<50000;skip+=500) {
                JsonNode page;
                try { page=mapper.readTree(lta.getBusStops(skip)).path("value"); }
                catch(Exception e) { throw new IllegalStateException(e); }
                if(!page.isArray()) throw new IllegalStateException("Invalid bus stops response");
                all.addAll((com.fasterxml.jackson.databind.node.ArrayNode)page);
                if(page.size()<500) return all.toString();
            }
            throw new IllegalStateException("Bus stops pagination limit exceeded");
        });
        if(!stops.available()) return null;
        List<String> matches=new ArrayList<>();
        for(JsonNode row:stops.data()) {
            Double lat=number(row,"Latitude"),lon=number(row,"Longitude");
            if(lat!=null && lon!=null && normalName(stop.name()).equals(normalName(text(row,"Description")))
                    && distance(stop.latitude(),stop.longitude(),lat,lon)<=100) {
                String code=text(row,"BusStopCode"); if(code!=null && code.matches("[0-9]{5}")) matches.add(code);
            }
        }
        return matches.size()==1?matches.getFirst():null;
    }
    private RouteEvidence busEvidence(EvidenceCache.Snapshot snapshot,String code,String service) {
        JsonNode services=snapshot.data().path("Services");
        if(!snapshot.available() || !services.isArray() || !code.equals(text(snapshot.data(),"BusStopCode")))
            return unavailable("LTA BusArrival",snapshot,"Bus arrivals are unavailable or the stop does not match");
        for(JsonNode row:services) if(service.equals(text(row,"ServiceNo"))) {
            List<Map<String,Object>> arrivals=new ArrayList<>();
            for(String field:List.of("NextBus","NextBus2","NextBus3")) {
                JsonNode bus=row.path(field); String arrival=text(bus,"EstimatedArrival");
                if(parseTime(arrival)==null || parseTime(arrival).isBefore(clock.instant().minusSeconds(60))) continue;
                Map<String,Object> values=selected(bus,"EstimatedArrival","Load","Feature","Type");
                arrivals.add(values);
            }
            if(arrivals.isEmpty()) return unavailable("LTA BusArrival",snapshot,"No upcoming arrival estimate for service "+service);
            return available("LTA BusArrival",snapshot,null,Map.of("busStopCode",code,"service",service,"arrivals",arrivals,
                    "note","Vehicle features do not verify accessibility of the whole journey"));
        }
        return unavailable("LTA BusArrival",snapshot,"No arrival data for the matching service "+service);
    }
    private RouteEvidence facilities(EvidenceCache.Snapshot snapshot,Set<String> stations,Set<String> names) {
        JsonNode rows=snapshot.data().path("value");
        if(!snapshot.available() || !rows.isArray() || (stations.isEmpty() && names.isEmpty()))
            return unavailable("LTA FacilitiesMaintenance",snapshot,"Facility maintenance data or station matching is unavailable");
        List<Map<String,Object>> matched=new ArrayList<>();
        for(JsonNode row:rows) {
            if(text(row,"StationCode")==null && text(row,"StationName")==null)
                return unavailable("LTA FacilitiesMaintenance",snapshot,"Unrecognized maintenance record");
            if(stations.contains(text(row,"StationCode")) || names.contains(normalName(text(row,"StationName"))))
                matched.add(selected(row,"Line","StationCode","StationName","LiftID","LiftDesc"));
        }
        return available("LTA FacilitiesMaintenance",snapshot,null,Map.of("matchedMaintenance",matched,
                "note","No matching report does not verify station or route accessibility"));
    }
    private RouteEvidence alerts(EvidenceCache.Snapshot snapshot,Set<String> lines) {
        JsonNode value=snapshot.data().path("value");
        if(!snapshot.available() || !value.isObject() || !value.path("Status").isValueNode() || lines.isEmpty())
            return unavailable("LTA TrainServiceAlerts",snapshot,"Train alert data or line matching is unavailable");
        String status=value.path("Status").asText();
        if(!Set.of("1","2").contains(status)) return unavailable("LTA TrainServiceAlerts",snapshot,"Unknown train service status");
        List<Map<String,Object>> matched=new ArrayList<>();
        JsonNode segments=value.path("AffectedSegments");
        if(!segments.isArray() && status.equals("2"))
            return unavailable("LTA TrainServiceAlerts",snapshot,"Disruption reported but affected lines could not be matched");
        for(JsonNode segment:segments) if(lines.contains(text(segment,"Line")))
            matched.add(selected(segment,"Line","Direction","Stations","FreePublicBus","FreeMRTShuttle"));
        return available("LTA TrainServiceAlerts",snapshot,null,Map.of("networkStatus",status,"matchingSegments",matched,
                "note","Status 1 includes normal service or minor delays; this is a current snapshot, not a forecast"));
    }
    private RouteEvidence crowding(EvidenceCache.Snapshot snapshot,Set<String> stations,String line) {
        JsonNode rows=snapshot.data().path("value");
        if(!snapshot.available() || !rows.isArray()) return unavailable("LTA PCDRealTime",snapshot,"Crowding data is unavailable");
        List<Map<String,Object>> matched=new ArrayList<>(); String observed=null;
        for(JsonNode row:rows) if(stations.contains(text(row,"Station"))) {
            String level=text(row,"CrowdLevel"); Instant start=parseTime(text(row,"StartTime")),end=parseTime(text(row,"EndTime"));
            if(level==null || !Set.of("l","m","h").contains(level) || start==null || end==null
                    || start.isAfter(clock.instant()) || end.isBefore(clock.instant().minusSeconds(600))) continue;
            matched.add(selected(row,"Station","StartTime","EndTime","CrowdLevel")); observed=text(row,"StartTime");
        }
        if(matched.isEmpty()) return unavailable("LTA PCDRealTime",snapshot,"No recent crowd observations for matched stations");
        return available("LTA PCDRealTime",snapshot,observed,Map.of("line",line,"stations",matched));
    }
    private RouteEvidence rainfall(EvidenceCache.Snapshot snapshot,RouteOption route) {
        JsonNode data=snapshot.data().path("data"),readings=data.path("readings"),stations=data.path("stations");
        if(!snapshot.available() || !stations.isArray() || !readings.isArray() || readings.isEmpty())
            return unavailable("NEA Rainfall",snapshot,"Rainfall observations are unavailable");
        JsonNode latest=null; Instant observed=null;
        for(JsonNode reading:readings) {
            Instant time=parseTime(text(reading,"timestamp"));
            if(time!=null && !time.isAfter(clock.instant().plusSeconds(60)) && (observed==null || time.isAfter(observed))) {
                latest=reading; observed=time;
            }
        }
        if(observed==null || observed.isBefore(clock.instant().minusSeconds(900)) || !latest.path("data").isArray())
            return unavailable("NEA Rainfall",snapshot,"Rainfall observations are stale or invalid");
        Map<String,Double> values=new HashMap<>();
        for(JsonNode reading:latest.path("data")) {
            Double value=number(reading,"value"); String id=text(reading,"stationId");
            if(id!=null && value!=null) values.put(id,value);
        }
        Map<String,Map<String,Object>> matched=new LinkedHashMap<>();
        for(var leg:route.legs()) if("WALK".equals(leg.mode())) for(var point:List.of(leg.from(),leg.to())) {
            if(point.latitude()==null || point.longitude()==null) continue;
            JsonNode nearest=null; double best=5000;
            for(JsonNode station:stations) {
                Double lat=number(station.path("location"),"latitude"),lon=number(station.path("location"),"longitude");
                if(lat==null || lon==null || !values.containsKey(text(station,"id"))) continue;
                double distance=distance(point.latitude(),point.longitude(),lat,lon);
                if(distance<best) { best=distance; nearest=station; }
            }
            if(nearest!=null) {
                String id=text(nearest,"id");
                matched.put(id,Map.of("stationId",id,"rainfallMm",values.get(id),"distanceFromWalkingEndpointMeters",Math.round(best)));
            }
        }
        if(matched.isEmpty()) return unavailable("NEA Rainfall",snapshot,"No recent rain gauge within 5 km of walking endpoints");
        return available("NEA Rainfall",snapshot,observed.toString(),Map.of("observations",List.copyOf(matched.values()),
                "note","Nearby rain gauges indicate observed conditions, not a route-specific forecast"));
    }
    private static boolean isRail(String mode) { return Set.of("SUBWAY","RAIL","TRAM","MRT","LRT").contains(mode==null?"":mode); }
    private Set<String> stationCodes(RouteLeg.Stop stop) {
        Set<String> result=new LinkedHashSet<>();
        for(String value:Arrays.asList(stop.code(),stop.id(),stop.name())) if(value!=null) {
            var matcher=STATION.matcher(value.toUpperCase(Locale.ROOT)); while(matcher.find()) result.add(matcher.group());
        }
        return result;
    }
    private String stationLine(String station) {
        return switch(station.replaceAll("[0-9]", "")) {
            case "EW","CG" -> "EWL"; case "NS" -> "NSL"; case "NE" -> "NEL";
            case "CC","CE" -> "CCL"; case "DT" -> "DTL"; case "TE" -> "TEL";
            case "BP" -> "BPL"; case "SE","SW" -> "STL"; case "PE","PW" -> "PTL"; default -> null;
        };
    }
    private String crowdLine(String station) {
        if(station.startsWith("CG")) return "CGL";
        if(station.startsWith("CE")) return "CEL";
        String line=stationLine(station);
        return "STL".equals(line)?"SLRT":"PTL".equals(line)?"PLRT":line;
    }
    private String serviceLine(String service) {
        if(service==null) return null;
        return switch(service.toUpperCase(Locale.ROOT).replaceAll("[^A-Z]", "")) {
            case "EWL","CGL","EASTWESTLINE" -> "EWL"; case "NSL","NORTHSOUTHLINE" -> "NSL";
            case "NEL","NORTHEASTLINE" -> "NEL"; case "CCL","CEL","CIRCLELINE" -> "CCL";
            case "DTL","DOWNTOWNLINE" -> "DTL"; case "TEL","THOMSONEASTCOASTLINE" -> "TEL";
            case "BPL","BUKITPANJANGLRT" -> "BPL"; case "STL","SLRT","SENGKANGLRT" -> "STL";
            case "PTL","PLRT","PUNGGOLLRT" -> "PTL"; default -> null;
        };
    }
    private static String normalName(String name) {
        return name==null?"":name.toUpperCase(Locale.ROOT).replaceAll("\\b(MRT|LRT|STATION|STN)\\b", "").replaceAll("[^A-Z0-9]", "");
    }
    private static Double number(JsonNode node,String key) { return RouteParser.number(node,key); }
    private static Instant parseTime(String value) {
        try { return value==null?null:OffsetDateTime.parse(value).toInstant(); } catch(RuntimeException e) { return null; }
    }
    private static double distance(double lat1,double lon1,double lat2,double lon2) {
        double a=Math.pow(Math.sin(Math.toRadians(lat2-lat1)/2),2)
                +Math.cos(Math.toRadians(lat1))*Math.cos(Math.toRadians(lat2))*Math.pow(Math.sin(Math.toRadians(lon2-lon1)/2),2);
        return 6371000*2*Math.asin(Math.min(1,Math.sqrt(a)));
    }
    private static Map<String,Object> selected(JsonNode node,String... keys) {
        Map<String,Object> result=new LinkedHashMap<>();
        for(String key:keys) { String value=text(node,key); if(value!=null) result.put(key,value.length()>1000?value.substring(0,1000):value); }
        return result;
    }
    private static RouteEvidence available(String source,EvidenceCache.Snapshot snapshot,String observed,Map<String,Object> details) {
        return new RouteEvidence(source,observed,snapshot.retrievedAt().toString(),"available",details);
    }
    private static RouteEvidence unavailable(String source,EvidenceCache.Snapshot snapshot,String reason) {
        return new RouteEvidence(source,null,snapshot==null?null:snapshot.retrievedAt().toString(),"unavailable",Map.of("reason",reason));
    }
}
