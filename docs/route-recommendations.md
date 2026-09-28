# Personalized route recommendations — backend and frontend contract

The backend resolves a trip with OneMap, enriches candidate routes with relevant evidence, loads the signed-in user's saved preferences, and makes one OpenAI ranking request. The model selects existing route IDs and supplies explanations. The backend validates those IDs and restores original route metrics and geometry. It never accepts model-generated itineraries.

## Configuration

Set these values in the root `.env` (never commit credentials):

```properties
ONEMAP_EMAIL=...
ONEMAP_PASSWORD=...
LTA_DATAMALL_API_KEY=...
OPENAI_API_KEY=...
OPENAI_MODEL=...
```

Choose an available model supporting strict Structured Outputs in the Responses API. `OPENAI_MODEL` is deliberately explicit: no model is silently substituted. Missing OpenAI configuration produces a clear HTTP 502 error when ranking is requested. The API key is only used server-side. Requests set `store: false` and exclude account identity, credentials, geometry and full reference datasets from model input.

For deterministic local demonstrations, start with `./mvnw spring-boot:run -Dspring-boot.run.profiles=mock`. Both fake routes and fake rankings require this profile. Authentication and the profile database are still required. Responses clearly identify mock data and must not be used for navigation.

Normal startup uses OneMap and OpenAI. There is no automatic fallback to fake routes or mock rankings.

## Frontend handoff

The Routes page calls this endpoint and displays ranked choices, per-route reasons, warnings and map geometry. Its API helper sends authenticated requests and a CSRF token. Equivalent request:

```js
import { API_URL, getCsrfToken } from './api'

const token = await getCsrfToken()
const response = await fetch(`${API_URL}/api/route-recommendations`, {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'X-XSRF-TOKEN': token,
  },
  body: JSON.stringify({
    origin: 'Jurong East MRT',
    destination: 'National University Hospital',
    departureTime: new Date().toISOString(),
  }),
})
const body = await response.json()
if (!response.ok) throw new Error(body.message || 'Recommendations unavailable')
const rankedRoutes = [body.recommendedRoute, ...body.alternatives]
```

Adjust the import path for the consuming file. Log in first using the existing session flow. Fetch a current CSRF token with the same browser session; send the token returned in the `/api/auth/csrf` JSON response.

### Request

`POST /api/route-recommendations`

| Field | Type | Requirement |
|---|---|---|
| origin | string | Nonblank place/address, at most 500 characters |
| destination | string | Nonblank place/address, at most 500 characters |
| originCoordinates / destinationCoordinates | Optional `{ latitude, longitude }` | Use resolved coordinates or GPS; supplied coordinates take precedence over geocoding the display name |
| departureTime | ISO 8601 timestamp with offset | Required; UTC is accepted and converted to Singapore time |

Do not send user ID, email, walking limits or preferences. Preferences come from the authenticated profile (`walkingSpeed`, `walkingTolerance`, `preferSheltered`). The old `preferences` request object is no longer part of the contract. The backend does not map qualitative tolerance to invented numerical limits.

### Response

```json
{
  "requestId": "server-request-id",
  "recommendedRoute": {
    "id": "onemap-route-1",
    "summary": "WALK → BUS 97 → WALK",
    "durationMinutes": 23,
    "walkingMinutes": 3,
    "transfers": 0,
    "accessibility": "unknown",
    "walkingDistanceMeters": 22,
    "distanceMeters": 1422,
    "estimatedShelteredWalkingMeters": null,
    "legs": [],
    "routePaths": [],
    "evidence": [],
    "reasons": ["Short walking distance suits your walking tolerance."],
    "warnings": ["Accessibility has not been verified."]
  },
  "alternatives": [],
  "reasons": ["Short walking distance suits your walking tolerance."],
  "warnings": ["Accessibility has not been verified."],
  "sources": ["onemap-route-data"],
  "engine": "openai:configured-model"
}
```

This abbreviated example is illustrative, not a real recommendation. Successful responses contain exactly `min(3, available candidate count)` unique routes. `recommendedRoute` is rank 1; `alternatives` contains ranks 2 and 3 when available. Reasons at the top level repeat the first route's reasons for compatibility; each route also has its own reasons and warnings. Route IDs are request-local and must not be reused across trips.

- Missing metrics are `null`, not zero. Render them as “Unavailable.”
- `accessibility` is currently `unknown`, replacing the unverified `wheelchairAccessible: false` field. Do not infer wheelchair access from a bus vehicle's WAB feature or lack of maintenance reports.
- `routePaths` is an array of leg polylines; each polyline is an array of `[latitude, longitude]` pairs, suitable for the existing Leaflet map. Never join disconnected legs with a straight line.
- `legs` preserves order and includes mode, service, from/to stops (`id`, `code`, `name`, `latitude`, `longitude`), duration in seconds, distance in metres, optional start/end timestamps, and the decoded `path`.
- `evidence` has `source`, `observedAt`, `retrievedAt`, `availability`, and source-specific `details`. Unknown provider observation times are null. Fetch time is not observation time.
- Display shelter as “Estimated sheltered walking: … m”; it does not prove full coverage. Model reasons should be displayed as text, never injected HTML.

### Errors

| Status | Meaning |
|---|---|
| 400 | Invalid or missing trip fields |
| 401 | No authenticated session (with a valid CSRF token) |
| 403 | Missing/invalid CSRF token, including unauthenticated POSTs without a token |
| 503 | Profile missing, OneMap failure, or no usable candidate routes |
| 502 | OpenAI unconfigured, unavailable, refused, incomplete, or returned invalid selections |

Application errors contain `status`, `message`, `requestId`, and `timestamp`. Spring Security rejection bodies may differ; the frontend should handle non-JSON errors too. Provider diagnostics and credentials are not echoed to the browser.

## Extraction and ranking behavior

- OneMap currently supplies up to three candidates. “Top three” is a ranking of those candidates, not an exhaustive search of every possible route. When coordinates are omitted, names use OneMap's first search match. The frontend sends GPS coordinates when available; otherwise the backend resolves the typed place names. Map markers use the returned itinerary endpoints. Mock mode needs no geocoding and displays unavailable geometry honestly.
- OneMap metrics remain provider estimates. The backend preserves ordered legs and service/stop identifiers. Missing required itinerary arrays are errors, not empty successful data.
- Bus arrivals match both stop code and service. Unknown stop IDs can be matched using a unique exact normalized stop name within 100 metres, using paginated cached LTA bus-stop reference data. Ambiguous matches stay unknown.
- Train alerts match relevant lines. Maintenance matches station codes or normalized names. Crowding matches station codes and known line aliases. Unrecognized identifiers are reported as missing evidence.
- Rain uses the most recent observation within 15 minutes, choosing available gauges within 5 km of walking-leg endpoints. These are nearby observations, not route-specific forecasts. Zero is used only when explicitly reported.
- Departures more than 15 minutes ahead or behind server time exclude bus arrivals, rainfall and current crowding. Current train alerts and maintenance remain labelled snapshots, never forecasts.
- Shelter estimates intersect walking polylines with buffered covered-linkway geometry in Singapore's metric SVY21 coordinate system (EPSG:3414). The tolerance defaults to 10 metres (`routing.shelter-tolerance-meters`). Overlapping buffers are unioned to avoid double counting, and estimated distance is capped by known provider walking distance. Missing walking geometry or invalid/empty linkway data produces null, not zero.
- Reference data is cached for 24 hours; live data and provider failures for 60 seconds. A request-local cache prevents duplicate fetches for the same bus stop or line. Expired data is not silently served as current evidence.
- Optional source failures produce explicit warnings while retaining OneMap routes. If OneMap itself fails there is no ranking call.
- The model context is an allowlist built from `RouteContext`, with no user/account identity or route geometry. Input is capped at 80,000 characters; excessively large evidence produces an error rather than silently dropping facts.
- OpenAI receives a strict JSON schema with candidate IDs as an enum. Backend validation independently requires the correct count, unique existing IDs and bounded explanations. Schema validation does not prove that prose explanations are factually correct; model-quality evaluation remains necessary.

## Tests and live verification

Run `./mvnw test` in `backend`. Application-context tests require the configured PostgreSQL database. Focused route tests can run without PostgreSQL:

```sh
./mvnw test -Dtest='RouteParserTests,EvidenceCacheTests,RouteEnrichmentServiceTests,ShelterEstimatorTests,RouteDataAggregatorServiceTests,RouteRecommendationAgentTests,OpenAiModelGatewayTests,RouteRecommendationSecurityTests'
```

Fixtures in `src/test/resources/routes` are synthetic provider-shaped cases. Credentials were not configured during implementation, so live provider schemas, account permissions and live model quality still need verification. Record sanitized provider responses from a configured account and rerun adapter tests before release.

The opt-in `RouteRankingLiveEvaluationTests` makes paid OpenAI requests and is disabled by default. Export `RUN_OPENAI_EVAL=true`, `OPENAI_API_KEY`, and `OPENAI_MODEL`, then run `./mvnw test -Dtest=RouteRankingLiveEvaluationTests`. This evaluates preference scenarios separately from API parsing/validation. Inspect the report in `target/route-ranking-evaluation.json` for:

1. Poor tolerance + Slow: less walking outranks a slightly faster itinerary with substantially more walking.
2. Prefer sheltered: with equal journey/walking metrics, the more sheltered option ranks first.
3. Unknown accessibility/shelter: explanations must not claim verified access or guaranteed shelter.

Review each explanation against the supplied evidence, including units, stale data, and uncertainty. Repeat across representative Singapore trips and compare model changes against this baseline; passing structural tests alone is not evidence of ranking quality.
