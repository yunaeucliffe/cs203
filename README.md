# SilverRoute — CS203

## Current project setup

- `backend/`: Java 25 Spring Boot application, managed with Maven.
- `frontend/`: a standalone HTML, CSS, and JavaScript demo in `index.html`.

React is the intended frontend framework, but it has not been set up yet. There is currently no `package.json`, so `npm install` and `npm run dev` are not available in this checkout.

## Run the backend

Install JDK 25 and ensure `JAVA_HOME` points to that JDK and Java is available on your `PATH`. Check with `java -version`.

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
