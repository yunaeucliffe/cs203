-- Creates or upgrades the SilverRoute schema in the database you are
-- CONNECTED to. It never creates databases or switches connections, so use it
-- for a managed/provider database whose name is not "silverroute" (whatever
-- DB_NAME / DB_URL points at) or where the role cannot CREATE DATABASE:
--
--   psql "<provider connection string>" -v ON_ERROR_STOP=1 -f database/bootstrap.sql
--
-- For local development, database/schema.sql creates "silverroute" and then
-- runs this file against it. All statements are IF NOT EXISTS/non-destructive,
-- so rerunning upgrades an existing database without touching its data.

\set ON_ERROR_STOP on


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

    walking_only_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    walking_only_max_distance_meters INTEGER NOT NULL DEFAULT 500
        CHECK (walking_only_max_distance_meters BETWEEN 100 AND 5000),
    walking_speed VARCHAR(20) NOT NULL DEFAULT 'Normal'
        CHECK (walking_speed IN ('Slow', 'Normal', 'Fast')),

    minimize_walking_priority INTEGER NOT NULL DEFAULT 50,
    shelter_priority INTEGER NOT NULL DEFAULT 20,

    CONSTRAINT fk_preferences_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


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


-- Prevent a user from creating multiple saved places
-- with the same label.

CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_places_user_label
ON saved_places(user_id, label);

-- Also upgrades existing installations; paths are relative to this file.
\ir migrations/001_preference_priorities.sql
\ir migrations/002_saved_place_categories.sql

\ir migrations/003_trip_shares.sql
\ir migrations/004_spring_session.sql
\ir migrations/005_widen_session_principal_name.sql
