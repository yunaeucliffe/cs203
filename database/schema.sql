-- Run with: psql -U postgres -d postgres -f database/schema.sql
-- The commands below create the application database when it does not exist.
\set ON_ERROR_STOP on
\connect postgres

SELECT 'CREATE DATABASE silverroute'
WHERE NOT EXISTS (
    SELECT FROM pg_database WHERE datname = 'silverroute'
)\gexec

\connect silverroute

-- 1. USERS

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. USER PREFERENCES

CREATE TABLE IF NOT EXISTS user_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    walking_speed VARCHAR(20) NOT NULL DEFAULT 'Normal',
    max_walking_distance INTEGER NOT NULL DEFAULT 500,
    avoid_stairs BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_preferences_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- Remove the legacy preference. Sheltered routes are chosen from rain conditions.
ALTER TABLE user_preferences
DROP COLUMN IF EXISTS prefer_sheltered;

-- 3. SAVED PLACES

CREATE TABLE IF NOT EXISTS saved_places (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL,
    label VARCHAR(100) NOT NULL,
    address VARCHAR(500) NOT NULL,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_saved_place_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- Prevent user from accidentally creating
-- multiple saved places with the same label.
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_places_user_label
ON saved_places(user_id, label);
