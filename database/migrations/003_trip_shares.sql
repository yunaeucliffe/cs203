CREATE TABLE IF NOT EXISTS trip_shares (
    id UUID PRIMARY KEY,
    token VARCHAR(64) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    origin VARCHAR(500) NOT NULL,
    destination VARCHAR(500) NOT NULL,
    route_summary VARCHAR(2000) NOT NULL,
    estimated_arrival TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    live_location BOOLEAN NOT NULL DEFAULT FALSE,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_updated_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_trip_shares_owner ON trip_shares(user_id);
-- Added after the table was first created; safe to rerun on existing databases.
ALTER TABLE trip_shares ADD COLUMN IF NOT EXISTS arrived BOOLEAN NOT NULL DEFAULT FALSE;
