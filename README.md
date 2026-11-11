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

`schema.sql` creates `silverroute` if needed and sets up `users`, `user_preferences`, `saved_places`, `categories`, `route_choice_snapshots`, `trip_shares`, and the `spring_session`/`spring_session_attributes` tables used for shared HTTP session storage. It automatically applies all migrations, so no separate migration commands are needed for a fresh installation. For an existing database, rerun `schema.sql` (all statements are `IF NOT EXISTS`/non-destructive) to add the session tables without affecting existing data.

Saved preferences contain walking speed, independent 0–100 walking and shelter priorities, automatic learning, and an opt-in walking-only alternative (default limit 500 m, configurable from 100 to 5,000 m). An eligible walking route reserves one of the three result slots and does not train preferences when chosen.

The walking-only fields are included directly in `schema.sql`. For an existing database without these fields, recreate the database using the setup commands above before starting the updated backend. Recreating the database deletes existing data; rerunning `schema.sql` alone does not add these fields to an existing table. Walking tolerance and the shelter boolean are no longer stored.

`mockdata.sql` creates or updates the development account with a BCrypt password hash and sample preferences. Rerunning it resets that account's walking speed and priority scores, so use it only when you intend to reset the development account.

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

`DB_HOST`, `DB_NAME`, `DB_USERNAME` and `DB_SSLMODE` compose the JDBC URL for local development; `DB_URL` overrides them with a full connection string when pointing at an external/managed PostgreSQL instance. See [Deployment](#deployment-vercel) for the deployed configuration.

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

## Deployment (Vercel)

The frontend and backend deploy together as one Vercel project using [Services](https://vercel.com/docs/services): the frontend builds normally (Vite), and the backend builds from `backend/Dockerfile` as a container image (Vercel's [container runtime](https://vercel.com/docs/functions/runtimes/container)). PostgreSQL stays external — it is never bundled into either build.

### One-time project setup (manual, in the Vercel dashboard)

1. **Root Directory**: set the project's Root Directory to the repository root (empty), not `frontend/`. The root [`vercel.json`](vercel.json) defines both services and the routes between them; a subdirectory root would never see it.
2. **Environment variables** — set these on the backend's environment (Production and Preview as needed):
   - `DB_URL` (preferred for a managed provider's connection string) or `DB_HOST`/`DB_NAME`/`DB_USERNAME`/`DB_PASSWORD`/`DB_SSLMODE=require` (or stricter) for a plain external PostgreSQL instance. PostgreSQL itself is **not** deployed by this project — provision it separately (e.g. a Vercel Marketplace Postgres integration, or any reachable PostgreSQL host) and apply `database/schema.sql` against it before first deploy.
   - `SESSION_COOKIE_SECURE=true` and leave `SESSION_COOKIE_SAMESITE` at its `lax` default, since the frontend and backend now share one origin.
   - `CRON_SECRET` — any random string. Vercel automatically sends it as `Authorization: Bearer <value>` when invoking the cron job below; the backend rejects the cleanup endpoint without it.
   - `CORS_ALLOWED_ORIGINS` only if the deployed frontend origin differs from the backend's own (same-origin deployments via the routing below don't need this changed).
   - The existing `LTA_DATAMALL_API_KEY`, `ONEMAP_EMAIL`, `ONEMAP_PASSWORD`, `OPENAI_API_KEY`, `OPENAI_MODEL` as already used locally.
     None of these block startup: if one is missing the backend still boots, logs a warning, and the affected feature reports itself unavailable (OneMap-backed search/routing returns 503; LTA-backed evidence shows as unavailable).
   - Leave `PORT` unset unless you need something other than the container default; the backend honors it automatically (`server.port=${PORT:8081}`).
3. **Environment variables** — set this on the frontend's environment:
   - `VITE_API_URL=/` so browser requests stay on the frontend's own origin and are routed to the backend by the rewrites below (see `frontend/src/api.js`).
4. Deploy (Git push or `vercel deploy`/`vercel --prod`). Do not deploy from this repository state without reviewing the above — these steps are manual on purpose.

### How requests are routed

`vercel.json` at the repository root declares two services and the public route table:

- `services.frontend` (`root: frontend`) — the Vite build, with its own catch-all rewrite to `index.html` so client-side (React Router) deep links resolve.
- `services.backend` (`root: backend`, `runtime: container`) — built from `backend/Dockerfile`.
- Top-level `rewrites` send `/api/*` to the backend service (unchanged request path, matching the backend's existing `/api/...` mappings) and everything else to the frontend. This replaces the old `frontend/vercel.json` rewrite to the Railway backend (`https://cs203-production.up.railway.app`), which has been removed.

### Session persistence and scaling

The backend is stateless at the process level: Spring Session JDBC (`database/migrations/004_spring_session.sql`) stores HttpSession data in PostgreSQL instead of memory, so a login survives the container being replaced and works no matter which instance (or how many) answer later requests. CSRF protection, secure cookies, logout, and account deletion behave exactly as before — only where the session is stored changed.

### Expired trip-share cleanup

`TripShareService` still runs its in-process `@Scheduled` cleanup every 10 minutes for environments that stay warm, but a container on Vercel scales to zero after idle traffic and that timer stops firing. `GET /api/internal/trip-shares/cleanup` triggers the same cleanup over HTTP and is wired to the `crons` entry in `vercel.json` (`0 3 * * *`, i.e. once daily — the minimum Hobby plan cron frequency; tighten the schedule if the project is on Pro/Enterprise). The endpoint requires the `CRON_SECRET` bearer token described above and does nothing without it. Expiry is still re-checked on every read (`TripShareService.read`/`requireActive`), so a link cannot be used past expiry even if cleanup is delayed.

### Local development

Unaffected: `vercel.json` only applies to Vercel builds/`vercel dev`. Continue running `./mvnw spring-boot:run` and `npm run dev` in two terminals as described above; `VITE_API_URL` stays unset locally so the frontend keeps talking to `http://localhost:8081` directly.

### Continuous deployment

This project uses Vercel's native Git integration for all deployments — there is no `vercel deploy`/`VERCEL_TOKEN` step in GitHub Actions, and none is needed. [`.github/workflows/ci.yml`](.github/workflows/ci.yml) is purely a test/lint/build gate; Vercel does the actual building and deploying itself, directly from the same commits.

**Two separate gates, two separate systems — don't conflate them:**

| Gate | Blocks | Mechanism | Status |
|---|---|---|---|
| Branch ruleset | Merging a PR into `main` | GitHub required status checks (`jira-key`, `backend`, `frontend`) | Already configured (existing repo state) |
| [Deployment Checks](https://vercel.com/docs/deployment-checks) | Promoting a build to the production domain | Vercel reads the same GitHub check results, for the exact commit it built | **Manual step below — not yet configured** |

How it fits together:

1. **Pull requests / feature branches** → Vercel's GitHub integration automatically builds a preview deployment for every push, independent of CI passing or failing. `ci.yml` runs `jira-key`, `backend`, `docker` (builds `backend/Dockerfile` the same way Vercel will, so a broken image is caught here instead of at deploy time), and `frontend` on the PR.
2. **Merging into `main`** pushes a commit that triggers two independent, parallel things on that exact SHA: `ci.yml` reruns (`push: branches: [main]`), and Vercel starts a new **production** build.
3. **Deployment Checks** (set up once, manually — see below) make Vercel hold that production build and *not* alias it to the production domain until the `backend`, `docker`, and `frontend` GitHub checks report success on that same commit.
4. **If any required check fails**, Vercel never promotes the new build — the existing production deployment keeps serving users untouched. (A human can still override this from the dashboard via "Force Promote", which is a deliberate, visible action, not something that happens automatically.)

#### Enable Deployment Checks (manual, one-time, in the Vercel dashboard)

1. Confirm **Settings → Git → Production Branch** is `main`.
2. Go to **Settings → Git → Deployment Checks** (or **Checks**, naming varies by dashboard version) and add `backend`, `docker`, and `frontend` as required checks. **Do not add `jira-key`** — that job only runs `if: github.event_name == 'pull_request'`, so it never posts a status on a push-to-`main` commit, and a required check that never reports would block production forever.
3. No GitHub secret is needed for this — Vercel reads GitHub's Check Runs API through its existing GitHub App installation, not through anything `ci.yml` has to push.

#### Rollback

If a bad build somehow still reaches production (e.g. a check was bypassed with Force Promote), two equivalent options:
- Dashboard: **Deployments → (previous good deployment) → Promote to Production** (instant, no rebuild).
- CLI: `vercel rollback` (rolls back to the previous production deployment) or `vercel promote <deployment-url>` (promotes a specific one).

#### Keeping preview and production isolated

- **Environment variables**: every backend variable listed under [One-time project setup](#one-time-project-setup-manual-in-the-vercel-dashboard) (`DB_URL`/`DB_*`, `CRON_SECRET`, `OPENAI_API_KEY`, etc.) should be set separately for the **Preview** and **Production** environments in Vercel's dashboard, with different values — never point Preview at the production database.
- **Preview database**: provision a second, separate PostgreSQL instance (or at minimum a separate database/schema) for Preview, and apply `database/schema.sql` to it too before the first PR deploy exercises the backend. `ddl-auto=validate` means a preview build whose entities don't match the preview schema will fail loudly at startup rather than touch data silently.
- **Cron jobs only run against the production deployment** — the `crons` entry in `vercel.json` never fires for preview deployments, so a Preview-scoped `CRON_SECRET` only matters if you test the cleanup endpoint manually against a preview URL.
- CI's own `backend` job already uses a disposable, dummy-credentialed Postgres service container (see `ci.yml`) — fully separate from both Preview and Production, nothing to change there.

GitHub secrets required for any of this: **none.** CI only runs tests/lint/build against throwaway services; Vercel's own Git integration handles every actual deployment, authenticated through its GitHub App installation rather than a stored token.

## Troubleshooting

- **Database connection fails:** confirm PostgreSQL is running, the `silverroute` database exists, and `DB_PASSWORD` in `.env` is correct. If `psql -h ::1` works but `psql -h 127.0.0.1` does not, set `DB_HOST=[::1]`.
- **Schema validation fails:** stop the backend and apply the migration listed under **Existing database**, then restart it. For a fresh database, run `database/schema.sql`. Reseeding is not required.
- **Login fails:** rerun `database/mockdata.sql` to restore the BCrypt development password.
- **Port 8081 is occupied:** stop the existing backend process or inspect it with `netstat -ano | Select-String ':8081'`.
- **PowerShell blocks `npm.ps1`:** use `npm.cmd` as shown above.
- **Stop either server:** press `Ctrl+C` in its terminal.

### Automatic preference learning

AI reviews each confirmed alternative route choice and can immediately adjust independent walking and shelter priorities by up to 10 points each. It uses the existing OPENAI_API_KEY and OPENAI_MODEL settings. If AI is unavailable or returns invalid output, the route is still confirmed and scores stay unchanged. Use **Undo choice** to clear a mistaken confirmation and choose again; its learning effect is reversed without overwriting newer manual settings. See [adaptive preferences](docs/adaptive-preferences.md) for behavior, APIs, tests, and the database migration required before starting this version.
