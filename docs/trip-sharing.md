# Trip and live location sharing

## Setup

Apply the migration to an existing database before starting the backend:

```powershell
psql -U postgres -d silverroute -f database/migrations/003_trip_shares.sql
```

New database setup through `database/schema.sql` includes this migration.
The migration has not been applied automatically by this change.

## User walkthrough

1. Sign in, find routes, and open the details of the route you want to share.
2. Near Start navigation, optionally check Include my live location. There is no duration to choose.
3. Click Share trip with family. For live sharing, the browser requests location access. If denied or unavailable, a details-only link is still created and a message explains the fallback.
4. The same section now shows Your trip is being shared, with Share link and Copy link buttons. A selectable link is available under Sharing details.
5. A recipient opens the link without signing in. They see origin, destination, route summary and estimated arrival, plus a map and update timestamp when a live location is available.
6. At the destination, tap I've arrived to immediately revoke the link and clear the stored location. Stop sharing can do the same at any time. A compact Manage sharing indicator provides access elsewhere in the app, while live updates continue in the background.
7. After refreshing the app, active shares are recovered from the server. Live shares need the Resume live location button before sending location again.
8. Sharing has a fixed 24-hour privacy backup if the user forgets to end it. It does not end at the estimated arrival time. Existing links keep their original expiry.

## Code walkthrough

- `TripShare` is one persisted share record. It stores a snapshot of the selected trip and only the latest location, not a location history.
- `TripShareRepository` loads shares by public token, lists the current owner's active shares, and locks owner mutations so a location update cannot undo a stop request.
- `TripShareService` creates a random 256-bit bearer token, sets expiry, checks ownership using the authenticated email, and rejects expired/revoked links. A public token permits reading only; updates and stopping require the owner's authenticated session. Invalid, expired and revoked tokens get the same clear message without trip data.
- `TripShareController` provides the endpoints below. Existing security rules protect `/api/users/**`, and existing CSRF protection applies to mutations. Successful public responses disable caching and leave out the share id and token.
- `TripSharing.jsx` contains the inline form, active controls, compact app-wide management panel, and separate background location updater. Browser geolocation runs only after the user opts in and permission succeeds. While live sharing is on, a fresh position is sent every 20 seconds (even when standing still); the timer is cleared on stop, expiry, or unmount. The server stamps each update with its own time, so device clock differences do not matter.
- `SharedTrip.jsx` polls every five seconds. A one-second clock hides the trip at expiry and marks the location outdated after 60 seconds. Network errors hide trip data until the link can be validated again.
- `App.jsx` recognizes `#share/<token>` before loading the signed-in app. The fragment avoids sending the token to the frontend hosting server as part of the page URL.

| Endpoint | Access | Purpose |
| --- | --- | --- |
| POST /api/users/me/trip-shares | Signed-in owner + CSRF | Create a share |
| GET /api/users/me/trip-shares | Signed-in owner | Recover active shares |
| PUT /api/users/me/trip-shares/{id}/location | Signed-in owner + CSRF | Set latest location |
| DELETE /api/users/me/trip-shares/{id} | Signed-in owner + CSRF | Revoke sharing (arrival or Stop sharing) |
| GET /api/shared-trips/{token} | Anyone with valid token | Read shared trip |

The ETA is the selected route's final arrival time when available and still in the future, otherwise the current time plus its estimated duration. It is a snapshot, not a continuously recalculated ETA.

## Acceptance criteria update

The agreed flow replaces user-selected sharing durations with arrival confirmation. Arrival is explicitly confirmed using I've arrived; it is not automatically detected, and navigation is still a placeholder. The server retains a 24-hour backup expiry. Both arrival and Stop sharing use the same owner-only DELETE endpoint; no new table columns or migration are required for this change.

## Verification and limitations

The service tests cover token creation, anonymous reads, invalid/expired/revoked links, owner checks, details-only sharing, disabled/expired location updates, and stopping. HTTP tests cover public reads (without share id or token), protected owner endpoints, CSRF, session identity, and validation.

Server revocation takes effect as soon as Stop sharing succeeds. An already-open recipient page clears on its next poll (up to five seconds); previously viewed details cannot be recalled. A stopped or expired link cannot retrieve new data.

Live location needs the app open. Device locking, background tabs, unavailable GPS and connectivity can pause updates; the recipient then sees the outdated marker. Browser permission cannot be proven by the backend; the UI obtains permission before enabling geolocation, and the server separately enforces owner authorization.

For a real second device, serve the frontend and backend at reachable HTTPS addresses and configure the existing API URL and CORS origin accordingly. The repository currently targets localhost. Test the browser permission prompt, device share menu, and locked-device behavior on the target devices; automated backend tests do not exercise these device capabilities.
