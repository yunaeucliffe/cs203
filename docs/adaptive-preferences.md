# Adaptive route preferences

Users keep their explicit walking speed. Walking tolerance and the shelter boolean have been removed. Two independent 0–100 priorities express route trade-offs: `minimizeWalkingPriority` and `shelterPriority`. They do not sum to 100 and do not describe physical ability.

## Learning behavior

- Previewing route cards never records a choice. **Choose this route** confirms one route per recommendation. **Undo choice** clears a mistaken confirmation so another route can be selected and confirmed before the 24-hour expiry.
- Only a confirmed alternative is compared against the original AI first-ranked route. Confirming the recommended route does not train the preferences.
- The AI compares walking distance, sheltered walking share, walking time, total time and transfers for the recommended and chosen routes, alongside current scores. It proposes independent integer changes between −10 and +10, a confidence level and a short explanation. Scores remain within 0–100. There is no three-choice threshold.
- Low confidence requires zero changes. Missing walking or shelter metrics prohibit changes to the corresponding score. The model is prompted to consider other possible motivations and keep adjustments small; its assessment is an inference, not proof of a preference.
- Walking speed is never learned. Confirming an eligible alternative makes one synchronous Responses API call using existing `OPENAI_API_KEY` and `OPENAI_MODEL` configuration, with a 15-second read timeout. This adds latency and model usage. Only numeric route metrics and scores are sent, without user identity or addresses; `store` is false.
- Strict structured output and server validation reject malformed, out-of-range, refused or incomplete answers. On failure, the route is still confirmed, with no score change or fixed-rule fallback. Mock mode never changes scores through AI.
- Profiles show the scores and an automatic-learning toggle (on by default). Manual saves invalidate learning from earlier recommendations. Users can override scores or disable learning at any time. Confirmations do not rerank existing results; the next search uses updated scores.

## API and storage

Profiles expose `walkingSpeed`, integer `minimizeWalkingPriority`, integer `shelterPriority`, and boolean `automaticLearning`. The preferences PUT requires all four fields; scores must be 0–100. Categorical-only requests are no longer supported.

Recommendation responses add `recommendationId` (a UUID, null for mock recommendations). `POST /api/route-recommendations/{recommendationId}/choice` accepts `{ "routeId": "...", "choiceVersion": 0 }` with the authenticated session and CSRF token. The response includes the confirmed route ID, whether preferences changed, current scores, a display message, and the new `choiceVersion`.

`POST /api/route-recommendations/{recommendationId}/choice/undo` accepts `{ "choiceVersion": 1 }` using the version from the confirmation receipt. It returns the new version (initially 2), which must be sent when confirming a replacement. Both endpoints require authentication and CSRF. Retrying the same undo is safe; a stale undo cannot clear a newer choice, and a delayed old confirmation cannot revive an undone one.

Undo restores the learning state from before the choice and replays subsequent active choices in order. This reverses changes to scores and the pending streak, including at the 0/100 limits. Subsequent manual settings changes are never reversed. Snapshots store the learning order, requested AI deltas and prior learning state. Undo replays stored deltas without calling the model again; these decisions are not reassessed after an earlier choice is removed. Legacy rule-based events retain their direction metadata for compatible replay. Confirmations created before undo metadata was introduced cannot be undone safely; start a new search for those.

Server snapshots store the owner's ID, offered route IDs and walking/shelter metrics, expiry, preference revision, learning metadata, choice version and confirmation receipt; they contain no route geometry or addresses. The receipt stores the AI explanation shown to the user. Offers expire after 24 hours. Unknown/foreign offers return 404, expired new confirmations/undo requests 410, unoffered routes 400, and attempting to change an already confirmed choice 409. Retrying the same confirmation returns its original receipt without learning again. Database locks serialize confirmations and manual updates across app instances.

Snapshots remain for replay protection. Operators can periodically purge records whose `expires_at` is more than seven days old; thereafter retries return 404:

```sql
DELETE FROM route_choice_snapshots WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '7 days';
```

## Database rollout

Stop the old backend and apply the migration **before starting the updated backend** (Hibernate uses schema validation):

```sh
psql -U postgres -d silverroute -v ON_ERROR_STOP=1 -f database/migrations/001_preference_priorities.sql
```

Fresh installations can use `database/schema.sql`, which includes the complete upgrade. Existing users initialize walking priority to Poor=80, Moderate=50, Good=20; shelter priority to Yes=80, No=20. New accounts use 50/20. Reapplying the migration preserves current/learned scores. The migration drops the obsolete categorical columns after score initialization. Rerun it even if previously applied to add the undo metadata and AI delta columns. Existing learned scores are preserved, and the migration can be rerun after the columns are gone. Deploy the updated backend and frontend together because the preference request contract changed.

## Verification

`PreferenceLearningTests` covers independent adjustments, confidence validation and bounds. `OpenAiPreferenceLearningGatewayTests` covers the API contract and invalid responses. `RouteChoiceServiceTests` covers replay, expiry and invalid offers. `RouteChoicePersistenceTests` uses the configured PostgreSQL database to verify persisted learning, concurrent retries, owner isolation and manual overrides; it creates and removes its own test users. Controller tests verify authentication and CSRF. Frontend API tests verify that choice submissions send identifiers, not client-supplied route metrics. Live model-quality evaluation is still separate from these deterministic tests.
