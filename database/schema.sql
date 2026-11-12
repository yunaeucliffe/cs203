-- Local development: run with
--   psql -U postgres -d postgres -f database/schema.sql
-- Creates the "silverroute" database when it does not exist, connects to it
-- and applies database/bootstrap.sql. For a managed/provider database (any
-- other name, or a role without CREATE DATABASE), run database/bootstrap.sql
-- directly against that database instead.

\set ON_ERROR_STOP on
\connect postgres

SELECT 'CREATE DATABASE silverroute'
WHERE NOT EXISTS (
    SELECT FROM pg_database WHERE datname = 'silverroute'
)\gexec

\connect silverroute

\ir bootstrap.sql
