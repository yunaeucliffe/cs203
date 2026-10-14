-- Repeatable upgrade: preserve scores before removing legacy preference columns.
\set ON_ERROR_STOP on
BEGIN;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS minimize_walking_priority INTEGER;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS shelter_priority INTEGER;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'user_preferences' AND column_name = 'walking_tolerance') THEN
        EXECUTE 'UPDATE user_preferences SET minimize_walking_priority = CASE walking_tolerance WHEN ''Poor'' THEN 80 WHEN ''Good'' THEN 20 ELSE 50 END WHERE minimize_walking_priority IS NULL';
    ELSE
        UPDATE user_preferences SET minimize_walking_priority = 50 WHERE minimize_walking_priority IS NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'user_preferences' AND column_name = 'prefer_sheltered') THEN
        EXECUTE 'UPDATE user_preferences SET shelter_priority = CASE WHEN prefer_sheltered THEN 80 ELSE 20 END WHERE shelter_priority IS NULL';
    ELSE
        UPDATE user_preferences SET shelter_priority = 20 WHERE shelter_priority IS NULL;
    END IF;
END $$;
ALTER TABLE user_preferences ALTER COLUMN minimize_walking_priority SET DEFAULT 50, ALTER COLUMN minimize_walking_priority SET NOT NULL;
ALTER TABLE user_preferences ALTER COLUMN shelter_priority SET DEFAULT 20, ALTER COLUMN shelter_priority SET NOT NULL;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'preference_priority_range' AND conrelid = 'user_preferences'::regclass) THEN
        ALTER TABLE user_preferences ADD CONSTRAINT preference_priority_range CHECK (minimize_walking_priority BETWEEN 0 AND 100 AND shelter_priority BETWEEN 0 AND 100);
    END IF;
END $$;

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS automatic_learning BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS tradeoff_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS preference_revision BIGINT NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS route_choice_snapshots (
    id UUID PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    preference_revision BIGINT NOT NULL,
    candidates TEXT NOT NULL,
    selected_route_id VARCHAR(255),
    receipt TEXT
);
CREATE INDEX IF NOT EXISTS route_choice_expiry ON route_choice_snapshots(expires_at);

-- Drop legacy fields only after their values have been converted above.
ALTER TABLE user_preferences
    DROP COLUMN IF EXISTS walking_tolerance,
    DROP COLUMN IF EXISTS prefer_sheltered;

-- Undo metadata is additive so rerunning upgrades installations with confirmed choices.
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS learning_sequence BIGINT NOT NULL DEFAULT 0;
ALTER TABLE route_choice_snapshots ADD COLUMN IF NOT EXISTS choice_version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE route_choice_snapshots ADD COLUMN IF NOT EXISTS learning_order BIGINT;
ALTER TABLE route_choice_snapshots ADD COLUMN IF NOT EXISTS learning_direction INTEGER;
ALTER TABLE route_choice_snapshots ADD COLUMN IF NOT EXISTS learning_before TEXT;
CREATE INDEX IF NOT EXISTS route_choice_learning_order ON route_choice_snapshots(user_id, preference_revision, learning_order);

-- Recorded AI proposals make undo deterministic without calling the model again.
ALTER TABLE route_choice_snapshots ADD COLUMN IF NOT EXISTS learning_walking_delta INTEGER;
ALTER TABLE route_choice_snapshots ADD COLUMN IF NOT EXISTS learning_shelter_delta INTEGER;

COMMIT;
