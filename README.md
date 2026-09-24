# SilverRoute - CS203

SilverRoute is a route-planning prototype with a React frontend and a Spring Boot backend. The backend connects to PostgreSQL and currently supports login, profile retrieval, saved-place management, route recommendations, weather, location search, and covered-linkway data.

## Technology stack

- Frontend: React 19 and Vite
- Backend: Java 25 and Spring Boot
- Database: PostgreSQL
- Build tools: npm and Maven Wrapper
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

Create the development database and tables from the repository directory:

```powershell
psql -U postgres -d postgres -f database/schema.sql
psql -U postgres -d silverroute -f database/mockdata.sql
```

`schema.sql` creates the `users`, `user_preferences`, and `saved_places` tables. It also removes the old `prefer_sheltered` preference because sheltered routing should be selected from current rain conditions instead of a permanent user preference.

`mockdata.sql` creates or updates the development user. The password is stored as a BCrypt hash; plaintext passwords are never stored.

The schema script creates `silverroute` only when it is missing, so it is safe to rerun. Afterward, rerun `mockdata.sql` to create or update the development account.

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
  "maxWalkingDistance": 500,
  "avoidStairs": true
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
  "maxWalkingDistance": 750,
  "avoidStairs": false
}
```

Allowed walking speeds are `Slow`, `Normal`, and `Fast`. Maximum walking distance must be between 50 and 10,000 metres.

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

The backend also provides `POST /api/route-recommendations`. It currently uses the project's mock model and route-data tooling, so the login/profile setup does not require an AI provider.

Example request:

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
- **Schema validation fails:** rerun `database/schema.sql`, followed by `database/mockdata.sql`.
- **Login fails:** rerun `database/mockdata.sql` to restore the BCrypt development password.
- **Port 8081 is occupied:** stop the existing backend process or inspect it with `netstat -ano | Select-String ':8081'`.
- **PowerShell blocks `npm.ps1`:** use `npm.cmd` as shown above.
- **Stop either server:** press `Ctrl+C` in its terminal.
