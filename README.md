# SilverRoute - CS203

SilverRoute is a route-planning prototype with a React frontend and a Spring Boot backend. The backend connects to PostgreSQL and currently supports login, profile retrieval, saved-place management, route recommendations, weather, location search, and covered-linkway data.

## Technology stack

- Frontend: React 19 and Vite
- Backend: Java 25 and Spring Boot
- Database: PostgreSQL
- Build tools: npm and Maven Wrapper
- API Documentation: Swagger UI and OpenAPI 3.0
- Backend URL: <http://localhost:8081>
- Frontend URL: <http://localhost:5173>

## Project structure

```text
backend/       Spring Boot application
database/      PostgreSQL schema and development data
frontend/      React and Vite application
```

## Prerequisites

Install the following before starting:

- JDK 25
- Node.js and npm
- PostgreSQL

Check that they are available:

```powershell
java -version
node --version
npm.cmd --version
psql --version
```

## Database setup

### Fresh installation

From the repository directory, create the database and seed the development account:

```sh
psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f database/schema.sql
psql -U postgres -d silverroute -v ON_ERROR_STOP=1 -f database/mockdata.sql
```

`schema.sql` creates `silverroute` if needed and sets up `users`, `user_preferences`, `saved_places`, and `route_choice_snapshots`. It automatically applies the preference migration, so no separate migration commands are needed for a fresh installation.

Saved preferences now contain walking speed, independent 0–100 walking and shelter priority scores, and an automatic-learning toggle. Walking tolerance and the shelter boolean are no longer stored.

`mockdata.sql` creates or updates the development account with a BCrypt password hash and sample preferences. Rerunning it resets that account's walking speed and priority scores, so use it only when you intend to reset the development account.

### Existing database

Stop the backend, then run this migration from the repository directory:

```sh
psql -U postgres -d silverroute -v ON_ERROR_STOP=1 -f database/migrations/001_preference_priorities.sql
```

Migration 001 adds the priority scores, learning fields, and route-choice table. It converts old preferences only where scores are missing. It then removes the obsolete walking-tolerance and shelter-boolean columns. Existing scores and user records are preserved; the migration can be rerun. All migration steps run in one transaction, so an error rolls back the upgrade. Rerun it when upgrading to AI learning and undo to add their tracking columns.

Restart the updated backend afterward. Hibernate uses `ddl-auto=validate`, so it checks the schema but does not apply migrations automatically. You do not need to rerun `mockdata.sql` for an upgrade.

These commands work in PowerShell, macOS, and Linux terminals. `psql` prompts for a password when required; it does not read the project's `.env`. If needed, add `-h ::1` or `-h 127.0.0.1` to match your backend's `DB_HOST`.

## Environment variables

Create the local environment file:

```powershell
Copy-Item .env.example .env
```

At minimum, set the PostgreSQL password in `.env`:

```properties
DB_HOST=[::1]
DB_PASSWORD=your_postgres_password
SESSION_COOKIE_SECURE=false
```

The default `[::1]` is the IPv6 loopback address used by the tested Windows PostgreSQL installation. If your PostgreSQL server listens on IPv4 instead, use `DB_HOST=localhost` or `DB_HOST=127.0.0.1`. The JDBC connection has a 10-second timeout so an unreachable host fails quickly.

Keep `SESSION_COOKIE_SECURE=false` for local HTTP development. Set it to `true` when deploying behind HTTPS.

The existing OneMap and LTA variables in `.env.example` can also be configured when those integrations are needed. Do not commit the `.env` file.

## Run the backend

From the repository directory:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

On macOS or Linux:

```bash
cd backend
./mvnw spring-boot:run
```

The backend starts on <http://localhost:8081>. PostgreSQL must be running, and the schema must exist because Hibernate is configured with `ddl-auto=validate`.

## Run the frontend

Open a second terminal from the repository directory:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

On macOS or Linux, `npm ci` and `npm run dev` can be used instead. Open <http://localhost:5173> after Vite starts.

## API documentation (Swagger UI)

Once the backend is running, view the interactive API documentation:

- **Swagger UI:** <http://localhost:8081/swagger-ui.html>
- **OpenAPI JSON:** <http://localhost:8081/v3/api-docs>

Swagger UI allows you to explore all endpoints, view request/response schemas, and test endpoints directly with "Try it out."

**Note on testing endpoints in Swagger UI:**
- **Authentication endpoints** (`/api/auth/login`, `/api/auth/signup`) work without a session.
- **Protected endpoints** (`/api/users/**`) require an active login session. Use the login endpoint first; the browser will maintain the session cookie for subsequent requests.
- **Mutation endpoints** (POST, PUT, DELETE) require a valid CSRF token. Copy the `XSRF-TOKEN` cookie value and paste it into the `X-XSRF-TOKEN` header for each request. The exception is `/api/route-recommendations`, which allows CSRF-free requests.

## Development login

Use the following seeded account:

```text
Email: mary@example.com
Password: password123
```

The login flow is:

```text
React SignIn page
  -> POST /api/auth/login
  -> BCrypt password validation
  -> authenticated Spring Security session
  -> HttpOnly JSESSIONID cookie
  -> GET /api/users/me/profile
  -> React Profile page
```

The browser sends the session cookie using credentialed requests. User identity is read from the authenticated server session rather than from a browser-controlled user ID. Login is protected with a CSRF token, the session expires after 30 minutes of inactivity, and the legacy `/api/users/{userId}/profile` route only permits the authenticated owner.

New accounts are created with a BCrypt password hash and default travel preferences, then signed into a server-side session automatically.

## Login and profile APIs

### Login

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "email": "mary@example.com",
  "password": "password123"
}
```

Successful response:

```json
{
  "success": true,
  "userId": 1,
  "name": "Mary Tan",
  "message": "Login successful"
}
```

Invalid credentials return HTTP `401` with a generic error message.

### Sign up

```http
POST /api/auth/signup
Content-Type: application/json
X-XSRF-TOKEN: <csrf-token>
```

```json
{
  "name": "Alex Lee",
  "username": "alexlee",
  "email": "alex@example.com",
  "password": "password123"
}
```

Usernames and email addresses must be unique. Passwords must contain between 8 and 72 characters. A successful registration returns HTTP `201`, creates default preferences, and authenticates the new session.

### Profile

```http
GET /api/users/me/profile
```

Example response:

```json
{
  "id": 1,
  "name": "Mary Tan",
  "email": "mary@example.com",
  "walkingSpeed": "Slow",
  "minimizeWalkingPriority": 80,
  "shelterPriority": 80,
  "automaticLearning": true
}
```

### Update preferences

This endpoint requires the authenticated session and a valid CSRF token:

```http
PUT /api/users/me/preferences
Content-Type: application/json
X-XSRF-TOKEN: <csrf-token>
```

```json
{
  "walkingSpeed": "Normal",
  "minimizeWalkingPriority": 50,
  "shelterPriority": 20,
  "automaticLearning": true
}
```

Allowed walking speeds are `Slow`, `Normal`, and `Fast`. Both priority scores are required integers from 0 to 100. `automaticLearning` is a required boolean.

## Saved places APIs

All saved-place endpoints require the authenticated session. Create, update, and delete requests also require the CSRF token in the `X-XSRF-TOKEN` header.

```http
GET    /api/users/me/saved-places
POST   /api/users/me/saved-places
PUT    /api/users/me/saved-places/{placeId}
DELETE /api/users/me/saved-places/{placeId}
```

Create and update request body:

```json
{
  "label": "Home",
  "address": "Tampines, Singapore",
  "latitude": 1.3521,
  "longitude": 103.9447
}
```

Coordinates are optional. Labels must be unique for each user. The Saved Places page supports adding, editing, deleting, and choosing a saved destination for route planning; Home displays the first two places as quick-access cards.

## Route-recommendation endpoint

`POST /api/route-recommendations` loads the authenticated user's saved preferences, collects OneMap routes and relevant LTA/rainfall/shelter evidence, and uses OpenAI to rank up to three candidates. It requires a session cookie and CSRF token. The backend returns existing route details, per-route explanations, provenance and availability warnings.

Set `OPENAI_API_KEY` and `OPENAI_MODEL` in `.env` along with the provider credentials. For explicit demo mode only, run `./mvnw spring-boot:run -Dspring-boot.run.profiles=mock`; authentication and PostgreSQL are still required. There is no automatic mock fallback.

Request body (preferences are loaded on the server):

```json
{
  "origin": "Jurong East MRT",
  "destination": "National University Hospital",
  "departureTime": "2026-09-28T08:00:00+08:00"
}
```

See [the frontend contract and setup guide](docs/route-recommendations.md) for CSRF usage, response fields, errors, evidence handling and tests. The Routes page displays the personalized recommendations, reasons, warnings, and selected route on the map.

## Tests and checks

Backend tests require the configured PostgreSQL database for application-context tests:

```powershell
cd backend
.\mvnw.cmd test
```

Frontend checks:

```powershell
cd frontend
npm.cmd run lint
npm.cmd run build
```

## Troubleshooting

- **Database connection fails:** confirm PostgreSQL is running, the `silverroute` database exists, and `DB_PASSWORD` in `.env` is correct. If `psql -h ::1` works but `psql -h 127.0.0.1` does not, set `DB_HOST=[::1]`.
- **Schema validation fails:** stop the backend and apply the migration listed under **Existing database**, then restart it. For a fresh database, run `database/schema.sql`. Reseeding is not required.
- **Login fails:** rerun `database/mockdata.sql` to restore the BCrypt development password.
- **Port 8081 is occupied:** stop the existing backend process or inspect it with `netstat -ano | Select-String ':8081'`.
- **PowerShell blocks `npm.ps1`:** use `npm.cmd` as shown above.
- **Stop either server:** press `Ctrl+C` in its terminal.

### Automatic preference learning

AI reviews each confirmed alternative route choice and can immediately adjust independent walking and shelter priorities by up to 10 points each. It uses the existing OPENAI_API_KEY and OPENAI_MODEL settings. If AI is unavailable or returns invalid output, the route is still confirmed and scores stay unchanged. Use **Undo choice** to clear a mistaken confirmation and choose again; its learning effect is reversed without overwriting newer manual settings. See [adaptive preferences](docs/adaptive-preferences.md) for behavior, APIs, tests, and the database migration required before starting this version.
