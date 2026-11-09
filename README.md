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

`schema.sql` creates `silverroute` if needed and sets up `users`, `user_preferences`, `saved_places`, `categories`, `route_choice_snapshots`, and `trip_shares`. It automatically applies all migrations, so no separate migration commands are needed for a fresh installation.

Saved preferences now contain walking speed, independent 0–100 walking and shelter priority scores, and an automatic-learning toggle. Walking tolerance and the shelter boolean are no longer stored.

`mockdata.sql` creates or updates the development account with a BCrypt password hash and sample preferences. Rerunning it resets that account's walking speed and priority scores, so use it only when you intend to reset the development account.

### Existing database

If you already have a `silverroute` database, update it after pulling new changes:

1. Stop the backend.
2. From the repository directory, run:

   ```sh
   psql -U postgres -d silverroute -v ON_ERROR_STOP=1 -f database/migrations/001_preference_priorities.sql
   psql -U postgres -d silverroute -v ON_ERROR_STOP=1 -f database/migrations/002_saved_place_categories.sql
   psql -U postgres -d silverroute -v ON_ERROR_STOP=1 -f database/migrations/003_trip_shares.sql
   ```

3. Start the backend again.

It's safe to run all three every time: they keep your existing data and skip anything already done.

If you skip this, the backend won't start, because it checks that the database matches the code.

- 001: walking and shelter preferences, and route choices
- 002: saved place categories
- 003: trip and live location sharing

Tip: `psql` asks for your PostgreSQL password. If it can't connect, add `-h 127.0.0.1` (or `-h ::1`).

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

The frontend has its own variables in `frontend/.env.example`, needed only when it is deployed
somewhere other than the Vite dev server. See **Deploy the frontend (Vercel)**.

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

## Deploy the frontend (Vercel)

Set the Vercel project's root directory to `frontend`; `frontend/vercel.json` supplies the
framework, the build command and the rewrite that keeps deep links on `index.html`.

### Recommended: reach the API through the same origin

SilverRoute authenticates with a session cookie, and browsers are increasingly strict about
cookies on cross-site requests: Safari blocks third-party cookies by default, so
`SameSite=None` is **not** enough to make a separately hosted API work there. Serving the API
from the same origin as the frontend avoids the problem, and needs no CORS or cookie changes.

Add a rewrite for `/api` ahead of the SPA rewrite in `frontend/vercel.json`, pointing at the
deployed backend. The order matters, or the SPA rewrite swallows `/api`:

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://silverroute-api.example.com/api/:path*" },
    { "source": "/((?!assets/).*)", "destination": "/index.html" }
  ]
}
```

Then set `VITE_API_URL=/` in the Vercel project, so the frontend calls its own origin, and
`SESSION_COOKIE_SECURE=true` in the backend's environment, because the browser is on HTTPS.

### Alternative: a separate API origin

Set `VITE_API_URL` to the backend's base URL, for example
`https://silverroute-api.example.com`. The backend then has to allow that origin and send its
cookies cross-site:

```properties
CORS_ALLOWED_ORIGINS=https://silverroute.vercel.app
SESSION_COOKIE_SAME_SITE=none
SESSION_COOKIE_SECURE=true
```

List each deployment origin explicitly. `CORS_ALLOWED_ORIGINS` accepts patterns, but a pattern
such as `https://silverroute-*.vercel.app` also matches projects on other people's Vercel
accounts and would grant them credentialed access to the API, so name the preview origins
actually needed rather than a prefix. `SameSite=none` also requires HTTPS on both sides, and
any browser with third-party cookies disabled — Safari by default — still drops the session
cookie, so sign-in fails there. Prefer the same-origin proxy above.

## Demo journey simulation

A presenter's tool that plays a simulated position along a route the route engine returned, so
an active journey can be demonstrated without walking one. It is off unless switched on with
`?demo=1`, and then appears as a dev panel on the journey screen. It can pause, resume, change
speed, jump to the bus stop, miss a bus on cue, and make location or live data fail — without
ever altering the wall clock. See [demo journey simulation](docs/demo-simulation.md).

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

### Delete account

This endpoint requires the authenticated session and a valid CSRF token:

```http
DELETE /api/users/me
X-XSRF-TOKEN: <csrf-token>
```

It permanently deletes the signed-in user together with their preferences, saved places, categories, and route choices, then ends the session and returns HTTP `204`. The related rows are removed by `ON DELETE CASCADE` in the same transaction, so a failed deletion changes nothing and the user stays signed in. Afterwards the email can no longer be used to log in. Other sessions for the deleted account (another browser or device) are signed out on their next request and get HTTP `401`. Sessions remember the user id, not just the email, so they cannot attach to a new account registered later with the same email. On the Profile page, **Delete account** asks for confirmation before calling this endpoint.

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
  "categoryId": null,
  "latitude": 1.3521,
  "longitude": 103.9447
}
```

Coordinates are optional. Labels must be unique for each user. The Saved Places page supports adding, editing, deleting, and choosing a saved destination for route planning; Home displays the first two places as quick-access cards.

Categories are loaded with `GET /api/users/me/categories` and created with `POST /api/users/me/categories` using a body such as `{"name":"Work","color":"#E8DFF5"}`. Use `PUT /api/users/me/categories/{categoryId}` with the same body to edit, or `DELETE /api/users/me/categories/{categoryId}` to delete. All endpoints require sign-in; writes also require the CSRF token. Users can only edit or delete their own categories. Deleting a category keeps its places as uncategorised. Set `categoryId` when creating or updating a saved place, or send `null` for no category. Categories and assignments are saved in PostgreSQL and restored when the page reloads.

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
