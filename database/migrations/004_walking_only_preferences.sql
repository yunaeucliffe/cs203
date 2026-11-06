-- Apply before deploying the backend (Hibernate validates the schema).
BEGIN;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS walking_only_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS walking_only_max_distance_meters INTEGER NOT NULL DEFAULT 500
    CHECK (walking_only_max_distance_meters BETWEEN 100 AND 5000);
COMMIT;
