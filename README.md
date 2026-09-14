# SilverRoute — CS203

## Current project setup

- `backend/`: Java 25 Spring Boot application, managed with Maven.
- `frontend/`: a standalone HTML, CSS, and JavaScript demo in `index.html`.

React is the intended frontend framework, but it has not been set up yet. There is currently no `package.json`, so `npm install` and `npm run dev` are not available in this checkout.

## Run the backend

Install JDK 25 and ensure `JAVA_HOME` points to that JDK and Java is available on your `PATH`. Check with `java -version`.

If Homebrew OpenJDK 25 is installed on an Apple Silicon Mac but `java` is not found, run:

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home
export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"
```

From the repository directory containing this README, open a terminal and run:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

On macOS/Linux, use `./mvnw spring-boot:run` instead.

Keep the terminal running. The backend uses port **8081**, configured in `backend/src/main/resources/application.properties`.

Check the backend at <http://localhost:8081/api/health>. A successful response contains:

```json
{"status":"ok","service":"silverroute-backend"}
```

JSON field order may differ.

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

## Open the current frontend

With the backend running, open `frontend/index.html` in your browser by double-clicking it in your file manager. No frontend build or Python installation is required for this method.

For a localhost URL, you can alternatively use VS Code's Live Server extension: right-click `frontend/index.html`, select **Open with Live Server**, and use the URL it opens.

If Python is already installed, another optional way to serve the current HTML page is to open a second terminal in the repository directory and run:

```powershell
cd frontend
python -m http.server 5500
```

Then visit <http://localhost:5500/index.html>. Python only serves the static file; it is not part of the application's technology stack.

The page calls <http://localhost:8081/api/health> automatically. Click **Check backend** to retry. A successful connection displays **Backend connected successfully**.

The backend does not currently serve `frontend/index.html`, so visiting port 8081 will not open the frontend page.

## Troubleshooting

- **Port 8081 is already in use:** an earlier backend instance or another application may still be running. In PowerShell, run `netstat -ano | Select-String ':8081'` and check the PID on the `LISTENING` row with `Get-Process -Id <PID>`. Stop the identified application in its original terminal or IDE before restarting. If the health endpoint already returns `silverroute-backend`, the backend may already be available.
- **Frontend connection failed:** confirm the backend has started and the health endpoint works. If you change the backend port, also update the API URL and port message in `frontend/index.html`.
- **Stopping servers:** press `Ctrl+C` in each server terminal.
