# SilverRoute — CS203

## Current project setup

- `backend/`: Java 25 Spring Boot application, managed with Maven, on port 8081.
- `frontend/`: React with Vite, Tailwind CSS and React Leaflet.

## Run locally

Use two terminals, starting from the repository root.

Backend (macOS):

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 25)
export PATH="$JAVA_HOME/bin:$PATH"
cd backend
./mvnw spring-boot:run
```

On Windows, configure JDK 25 and use `mvnw.cmd spring-boot:run` from `backend`.
The health check is <http://localhost:8081/api/health>.

For real route searches, create `.env` in the repository root (it is git-ignored):

```dotenv
ONEMAP_EMAIL=your_onemap_email
ONEMAP_PASSWORD=your_onemap_password
```

Restart the backend after changing credentials. Run it from `backend` so the configured
`../.env` import resolves correctly. Without credentials, the server and health check still
start, but real location/route searches return a configuration error. Credentials stay on
the backend; do not put them in frontend environment variables.

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite (normally <http://localhost:5173>). Vite proxies `/api` to
`http://localhost:8081`. Restart Vite after changing `vite.config.js`. Opening `index.html`
directly or using Live Server does not run this React application correctly.

## Route search integration

1. Enter a destination on Home and select **Find route**.
2. On Routes, enter a starting point or select **Use my location** and allow browser access.
3. Select **Find route** to resolve addresses through `/api/location/parsed`, then request
   `/api/route/parsed` with coordinates and a departure timestamp.
4. Choose among returned route options. Duration, walking time, transfers and available
   distances come from OneMap. The map fits the endpoints and decoded route legs.

Location search currently selects the first OneMap match; the resolved addresses appear
above the route selector. There is no personalised ranking in this screen. Missing geometry
is not replaced with a fabricated path. Sheltered percentage and accessibility remain
unavailable/unverified; they are not inferred from the route response. Sign-in, saved places,
weather overlays and turn-by-turn navigation are not connected by this integration.

The backend converts departure timestamps to Singapore time and decodes each OneMap leg's
encoded polyline into latitude/longitude pairs. See the [OneMap routing documentation](https://www.onemap.gov.sg/apidocs/routing).

The Vite proxy is a development setup. Production hosting must forward `/api` to the backend.

## Verification

```bash
cd frontend
npm run build
npm run lint
npm test
```

From `backend`, with JDK 25 selected, run `./mvnw test`. Automated route tests use fixtures;
real OneMap calls require valid credentials and network access.

## Try the mock route-recommendation agent

The backend includes a provider-neutral agent skeleton at `POST /api/route-recommendations`.
It currently uses a deterministic mock model and mock route-data tool, so it does not need
an AI provider, network connection, or API key.

With the backend running, submit a trip from another terminal:

```bash
curl -X POST http://localhost:8081/api/route-recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "Jurong East MRT",
    "destination": "National University Hospital",
    "departureTime": "2026-09-14T14:00:00+08:00",
    "preferences": {
      "maxWalkingMinutes": 10,
      "wheelchairAccessible": true,
      "minimizeTransfers": true
    }
  }'
```

The response contains a recommended route, alternatives, reasons, warnings, sources,
an engine identifier, and a request ID. Invalid input returns a structured `400` response.
If no registered route-data tool can supply routes, the endpoint returns `503`.

### Agent extension points

- Implement `ModelGateway` to replace the deterministic mock with a real AI model.
- Implement `RouteDataTool` to add OneMap, LTA DataMall, or another data provider.
- Register implementations as Spring components; `ToolRegistry` exposes them to the agent.
- Provider credentials and provider-specific response types should remain inside each adapter.

The agent limits each request to five tool calls. The controller and public response contract
do not depend on a specific model or route-data provider.

## Troubleshooting

- **Backend Java version error:** use JDK 25 for Maven and the application. Check `java -version` and `./mvnw -version`.
- **Route search is not configured:** populate the root `.env` with OneMap credentials and restart the backend from its directory.
- **Cannot reach the backend:** check port 8081, `/api/health`, and that you opened the Vite URL.
- **Location permission denied:** type a starting point instead. Geolocation requires localhost or HTTPS.
- **No routes found:** check the resolved addresses and try another journey.
- **Port 8081 already in use:** stop the earlier instance in its terminal before restarting.
- **Stopping servers:** press `Ctrl+C` in each terminal.
