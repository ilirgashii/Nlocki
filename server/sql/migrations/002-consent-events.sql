-- Apply as the database administrator before updating an existing PostgreSQL beta stack.
CREATE TABLE IF NOT EXISTS consent_events(id bigserial PRIMARY KEY,user_id text NOT NULL REFERENCES users ON DELETE CASCADE,version text NOT NULL,health_consent boolean NOT NULL,created timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON consent_events TO nlocki_app;
GRANT USAGE,SELECT ON SEQUENCE consent_events_id_seq TO nlocki_app;
