#!/bin/sh
set -e

# Apply the Prisma schema to the database on every boot. `db push` is
# idempotent, so this safely creates the Person table on first deploy and
# is a no-op afterwards. Requires DATABASE_URL to be set in the environment.
if [ -n "$DATABASE_URL" ]; then
  echo "› Syncing database schema (prisma db push)…"
  npx prisma db push --skip-generate --accept-data-loss || \
    echo "⚠︎  prisma db push failed — continuing (app falls back to mock data on reads)."
else
  echo "⚠︎  DATABASE_URL not set — running on mock data (read-only demo)."
fi

echo "› Starting Next.js on port ${PORT:-3000}…"
exec npm run start
