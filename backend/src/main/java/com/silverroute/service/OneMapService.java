package com.silverroute.service;

import java.time.Instant;
import java.util.*;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.silverroute.api.RouteOption;
import com.silverroute.api.LocationResult;
import com.silverroute.api.LocationSuggestion;
import com.silverroute.exception.InvalidAddressException;
import com.silverroute.exception.RouteDataUnavailableException;

import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;

// Communicates with OneMap API
@Service
public class OneMapService {

    @Value("${ONEMAP_EMAIL}")
    private String email;

    @Value("${ONEMAP_PASSWORD}")
    private String password;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final Object tokenLock = new Object();
    private final java.time.Clock clock;
    private final Map<String, CachedAddress> addressCache = new LinkedHashMap<>(16, 0.75f, true);
    private static final int ADDRESS_CACHE_LIMIT = 500;
    private static final java.time.Duration ADDRESS_CACHE_TTL = java.time.Duration.ofMinutes(30);
    private record CachedAddress(String response, Instant expiresAt) {}

    // OneMap supplies the exact expiry time with each token 
    // The cache is kept for the lifetime of this application instance
    private volatile CachedToken cachedToken;
    private static final long TOKEN_REFRESH_BUFFER_SECONDS = 60;

    @org.springframework.beans.factory.annotation.Autowired
    public OneMapService() {
        this(com.silverroute.routing.ProviderHttp.client("https://www.onemap.gov.sg", 15));
    }

    OneMapService(RestClient restClient) {
        this(restClient, java.time.Clock.systemUTC());
    }

    OneMapService(RestClient restClient, java.time.Clock clock) {
        this.restClient = restClient;
        this.clock = clock;
        objectMapper = new ObjectMapper();
    }

    // Returns the cached OneMap access token, refreshing it only when it is near expiry
    public String getToken() {
        CachedToken token = cachedToken;
        if (isUsable(token)) {
            return token.value();
        }

        // Avoid multiple simultaneous requests all generating a new token
        synchronized (tokenLock) {
            token = cachedToken;
            if (isUsable(token)) {
                return token.value();
            }

            cachedToken = requestToken();
            return cachedToken.value();
        }
    }

    private CachedToken requestToken() {
        Map<String, Object> response = restClient.post()
                .uri("/api/auth/post/getToken")
                .header("Content-Type", "application/json")
                .body(Map.of("email", email, "password", password))
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {
                });

        if (response == null || response.get("access_token") == null || response.get("expiry_timestamp") == null) {
            throw new IllegalStateException("OneMap token response did not include an access token and expiry timestamp");
        }

        try {
            String accessToken = response.get("access_token").toString();
            long expiryEpochSeconds = Long.parseLong(response.get("expiry_timestamp").toString());
            return new CachedToken(accessToken, Instant.ofEpochSecond(expiryEpochSeconds));
        } catch (NumberFormatException exception) {
            throw new IllegalStateException("OneMap returned an invalid token expiry timestamp", exception);
        }
    }

    private boolean isUsable(CachedToken token) {
        return token != null
                && Instant.now().plusSeconds(TOKEN_REFRESH_BUFFER_SECONDS).isBefore(token.expiresAt());
    }

    private static class CachedToken {
        private final String value;
        private final Instant expiresAt;

        private CachedToken(String value, Instant expiresAt) {
            this.value = value;
            this.expiresAt = expiresAt;
        }

        private String value() {
            return value;
        }

        private Instant expiresAt() {
            return expiresAt;
        }
    }

    // Searches a place name --> gets raw JSON
    public String searchLocation(String query) {
        String original = query == null ? "" : query.trim();
        String cacheKey = original.replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
        synchronized (addressCache) {
            CachedAddress cached = addressCache.get(cacheKey);
            if (cached != null && clock.instant().isBefore(cached.expiresAt())) return cached.response();
            addressCache.remove(cacheKey);
        }
        String cleaned = original
                .replaceAll("(?i)#\\s*\\d+[A-Z]?\\s*-\\s*\\d+[A-Z]?", " ")
                .replaceAll("[,;]", " ").replaceAll("\\s+", " ").trim();
        if (cleaned.isEmpty()) {
            throw new com.silverroute.exception.InvalidAddressException(
                    "Enter an address, building name or six-digit postal code.");
        }
        // A postal code identifies the building even when the input includes unit numbers
        // or a building name that does not match OneMap's indexed address.
        var postal = java.util.regex.Pattern.compile("(?<!\\d)\\d{6}(?!\\d)").matcher(cleaned);
        Set<String> searches = new LinkedHashSet<>();
        searches.add(original);
        if (postal.find()) searches.add(postal.group());
        searches.add(cleaned);
        searches.add(cleaned.replaceAll("(?i)\\bSingapore\\b", " ").replaceAll("\\s+", " ").trim());
        String response = null;
        for (String search : searches) {
            if (search.isEmpty()) continue;
            response = searchLocationKeywords(search);
            try {
                JsonNode root = objectMapper.readTree(response);
                if (root == null || root.hasNonNull("error") || !root.path("results").isArray()) {
                    throw new IllegalStateException("OneMap did not return address search results");
                }
                if (!root.path("results").isEmpty()) {
                    if (!search.equals(original) && search.matches("\\d{6}")) {
                        List<LocationResult> suggestions;
                        try {
                            suggestions = parseLocations(response);
                        } catch (Exception exception) {
                            throw new IllegalStateException("OneMap returned invalid address search data", exception);
                        }
                        throw new com.silverroute.exception.AddressConfirmationRequiredException(original, suggestions);
                    }
                    synchronized (addressCache) {
                        Instant now = clock.instant();
                        addressCache.values().removeIf(entry -> !now.isBefore(entry.expiresAt()));
                        addressCache.put(cacheKey, new CachedAddress(response, now.plus(ADDRESS_CACHE_TTL)));
                        if (addressCache.size() > ADDRESS_CACHE_LIMIT) {
                            addressCache.remove(addressCache.keySet().iterator().next());
                        }
                    }
                    return response;
                }
            } catch (com.fasterxml.jackson.core.JsonProcessingException exception) {
                throw new IllegalStateException("OneMap returned invalid address search data", exception);
            }
        }
        return response;
    }

    private String searchLocationKeywords(String query) {

        String token = getToken();

        return restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/common/elastic/search")
                        .queryParam("searchVal", "{query}")
                        .queryParam("returnGeom", "Y")
                        .queryParam("getAddrDetails", "Y")
                        .build(query))
                .header("Authorization", token)
                .retrieve()
                .body(String.class);
    }

    // Sends coordinates to OneMap --> gets raw route JSON
    public String getRoute(double originLat, double originLon, double destinationLat, double destinationLon,
            OffsetDateTime departureTime) {

        String token = getToken();

        departureTime = singaporeDeparture(departureTime);
        final OffsetDateTime localDeparture = departureTime;
        // OneMap expects a Singapore local date and time.
        try {
            return restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/public/routingsvc/route")
                            .queryParam("start", originLat + "," + originLon)
                            .queryParam("end", destinationLat + "," + destinationLon)
                            .queryParam("routeType", "pt")
                            .queryParam("date", localDeparture.format(
                                    DateTimeFormatter.ofPattern("MM-dd-yyyy")))
                            .queryParam("time", localDeparture.toLocalTime().format(
                                    DateTimeFormatter.ofPattern("HH:mm:ss")))
                            .queryParam("mode", "transit")
                            .queryParam("numItineraries", "3")
                            .build())
                    .header("Authorization", token)
                    .retrieve()
                    .body(String.class);
        } catch (HttpClientErrorException exception) {
            // OneMap replies 400 when a point is outside Singapore, and 404 when no route exists,
            // e.g. late at night when buses and trains have stopped and the trip is too far to walk.
            if (exception.getResponseBodyAsString().contains("outside Singapore")) {
                throw new InvalidAddressException(
                        "Your starting point or destination is outside Singapore. Choose places in Singapore and try again.");
            }
            if (exception.getStatusCode().value() == 404) {
                throw new RouteDataUnavailableException(noRouteMessage(localDeparture));
            }
            throw exception;
        }
    }

    // Explains why no route was found and what the user can do next.
    public static String noRouteMessage(OffsetDateTime departureTime) {
        LocalTime time = singaporeDeparture(departureTime).toLocalTime();
        if (time.isBefore(LocalTime.of(5, 30))) {
            return "No public transport routes are available right now. Buses and trains may have stopped for the night. "
                    + "Try again after 5:30 am, or choose a starting point closer to your destination.";
        }
        return "No public transport routes are available for this trip right now. "
                + "Try again later, or choose a different starting point or destination.";
    }

    public static OffsetDateTime singaporeDeparture(OffsetDateTime value) {
        return value.atZoneSameInstant(java.time.ZoneId.of("Asia/Singapore")).toOffsetDateTime();
    }

    // Extracts useful route information --> turns it into "RouteOptions" format
    public List<RouteOption> parseRoutes(String json) throws Exception {

        return new com.silverroute.routing.RouteParser().parse(json);
    }

    // Preserve provider ranking while skipping malformed and duplicate results.
    public List<LocationSuggestion> parseSuggestions(String json) throws Exception {
        JsonNode results = objectMapper.readTree(json).path("results");
        if (!results.isArray()) throw new IllegalArgumentException("Invalid location search response");
        var suggestions = new ArrayList<LocationSuggestion>();
        var seen = new HashSet<String>();
        for (JsonNode result : results) {
            String address = result.path("ADDRESS").asText("").trim();
            String building = result.path("BUILDING").asText("").trim();
            String name = building.isBlank() || building.equalsIgnoreCase("NIL")
                    || building.equalsIgnoreCase("null") ? address : building;
            try {
                double latitude = Double.parseDouble(result.path("LATITUDE").asText());
                double longitude = Double.parseDouble(result.path("LONGITUDE").asText());
                if (name.isBlank() || !Double.isFinite(latitude) || !Double.isFinite(longitude)
                        || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) continue;
                String key = address.toLowerCase(Locale.ROOT) + ":" + latitude + ":" + longitude;
                if (seen.add(key)) suggestions.add(new LocationSuggestion(
                        name, address, latitude, longitude));
                if (suggestions.size() == 5) break;
            } catch (NumberFormatException ignored) {
                // A malformed provider result must not hide other usable matches.
            }
        }
        return suggestions;
    }

    // Searches shorter versions of a failed query for possible alternatives.
    public List<LocationSuggestion> findAlternativeLocations(String query) throws Exception {
        if (query == null || query.isBlank()) {
            return List.of();
        }

        String[] words = query.trim().split("\\s+");

        // Avoid suggesting unrelated results for very short queries.
        for (int length = words.length - 1; length >= 2; length--) {
            String fallbackQuery = String.join(" ",
                    java.util.Arrays.copyOfRange(words, 0, length));

            String response = searchLocationKeywords(fallbackQuery);
            List<LocationSuggestion> suggestions = parseSuggestions(response);

            if (!suggestions.isEmpty()) {
                return suggestions;
            }
        }

        return List.of();
    }

    public LocationResult parseLocation(String json) throws Exception {
        return parseLocations(json).getFirst();
    }

    public List<LocationResult> parseLocations(String json) throws Exception {

        JsonNode root = objectMapper.readTree(json);
        JsonNode results = root.path("results");

        if (!results.isArray() || results.isEmpty()) {
            throw new com.silverroute.exception.AddressNotFoundException(
                    "Address could not be found. Try its six-digit postal code or building and street name.");
        }

        Set<LocationResult> locations = new LinkedHashSet<>();
        for (JsonNode result : results) {
            locations.add(parseLocationResult(result));
        }
        return List.copyOf(locations);
    }

    private LocationResult parseLocationResult(JsonNode firstResult) {
        String name = firstResult.path("ADDRESS").asText();
        double latitude;
        double longitude;
        try {
            latitude = Double.parseDouble(firstResult.path("LATITUDE").asText());
            longitude = Double.parseDouble(firstResult.path("LONGITUDE").asText());
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("Location coordinates are unavailable");
        }
        if (!Double.isFinite(latitude) || !Double.isFinite(longitude)
                || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
            throw new IllegalArgumentException("Location coordinates are invalid");
        }

        return new LocationResult(
                name,
                latitude,
                longitude);
    }

}
