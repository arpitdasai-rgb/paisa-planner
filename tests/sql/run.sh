#!/usr/bin/env bash
# Runs the real Supabase SQL (schema + every update) on a fresh database, then the checks.
# Usage: PGHOST=... PGPORT=... PGUSER=postgres tests/sql/run.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=paisa_test_$$
psql -v ON_ERROR_STOP=1 -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
trap 'psql -q -d postgres -c "drop database if exists '"$DB"'" >/dev/null 2>&1 || true' EXIT
for f in tests/sql/supabase-stub.sql supabase/schema.sql supabase/push.sql supabase/v2.sql supabase/v3.sql supabase/v4.sql; do
  psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$f" >/dev/null 2>&1 || { echo "FAILED loading $f"; psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$f" 2>&1 | tail -5; exit 1; }
done
psql -v ON_ERROR_STOP=1 -qtA -d "$DB" -f tests/sql/merge.test.sql 2>&1 | grep -E "ok  |FAILED|ERROR|ALL SQL" | sed -e "s/^.*NOTICE:  //"; test "${PIPESTATUS[0]}" -eq 0
