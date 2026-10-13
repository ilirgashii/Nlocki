#!/usr/bin/env bash
set -euo pipefail
# Initialization-only administrator creates a separate, non-superuser runtime role.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
\getenv app_password NLOCKI_APP_PASSWORD
SET log_min_error_statement = 'PANIC';
CREATE ROLE nlocki_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD :'app_password';
SQL
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f /opt/nlocki/schema.sql
