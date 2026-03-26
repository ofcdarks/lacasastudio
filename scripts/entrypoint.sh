#!/bin/sh
set -e

echo "🏠 LaCasaStudio V2.5 — Starting..."

# Validate required env vars
if [ -z "$JWT_SECRET" ]; then
  echo "❌ FATAL: JWT_SECRET environment variable is required (min 32 chars)"
  exit 1
fi

if [ ${#JWT_SECRET} -lt 32 ]; then
  echo "❌ FATAL: JWT_SECRET must be at least 32 characters"
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ FATAL: DATABASE_URL environment variable is required"
  exit 1
fi

# Run migrations
echo "📦 Running database migrations..."
cd /app/server && npx prisma db push --accept-data-loss 2>&1 || echo "⚠️ prisma db push had warnings (non-fatal)"

# Seed if needed
echo "🌱 Seeding database..."
node dist/db/seed.js 2>/dev/null || true

cd /app

echo "✅ Ready — executing: $@"
exec "$@"
