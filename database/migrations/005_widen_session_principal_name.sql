-- Authentication uses the email address as the session principal, and signup
-- accepts emails up to 255 characters (users.email is VARCHAR(255)). Spring
-- Session's stock schema (004) only allows 100, so longer emails failed to
-- persist their login with SQLSTATE 22001 (value too long).
--
-- Only alters when the column is narrower than 255, so rerunning bootstrap
-- against a live database takes no lock on SPRING_SESSION and never narrows
-- a column that was already widened further (or changed to TEXT).

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'spring_session'
          AND column_name = 'principal_name'
          AND character_maximum_length < 255
    ) THEN
        ALTER TABLE SPRING_SESSION ALTER COLUMN PRINCIPAL_NAME TYPE VARCHAR(255);
    END IF;
END
$$;
