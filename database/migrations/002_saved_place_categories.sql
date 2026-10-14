-- Repeatable upgrade: existing saved places remain uncategorised.
\set ON_ERROR_STOP on
BEGIN;

CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL CHECK (length(trim(name)) > 0),
    color VARCHAR(7) NOT NULL DEFAULT '#E8DFF5'
        CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Match the UI's case-insensitive duplicate-name check for each user.
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_user_name
ON categories(user_id, lower(trim(name)));

-- Deleting a category keeps its saved places, making them uncategorised.
ALTER TABLE saved_places ADD COLUMN IF NOT EXISTS category_id BIGINT
    REFERENCES categories(id) ON DELETE SET NULL;

COMMIT;
