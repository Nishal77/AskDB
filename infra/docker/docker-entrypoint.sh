#!/bin/bash
set -e

echo "🚀 Starting AskYourDatabase API setup..."

# Wait for database to be ready (if using local postgres container)
if [ -n "$VECTOR_DB_HOST" ] && [ "$VECTOR_DB_HOST" = "postgres" ]; then
  echo "⏳ Waiting for PostgreSQL container to be ready..."
  if command -v pg_isready >/dev/null 2>&1; then
    until pg_isready -h "$VECTOR_DB_HOST" -p "${VECTOR_DB_PORT:-5432}" -U "$VECTOR_DB_USER" 2>/dev/null; do
      echo "   Database not ready, waiting..."
      sleep 2
    done
    echo "✅ Database is ready!"
  else
    echo "⚠️  pg_isready not available, skipping wait (assuming database is ready)"
    sleep 3
  fi
else
  echo "ℹ️  Using external database (NeonDB or other), skipping local DB wait"
fi

# Navigate to workspace root
cd /app

# Ensure Prisma Client is generated
echo "🔨 Generating Prisma Client..."
cd packages/prisma
pnpm generate || {
  echo "❌ Failed to generate Prisma Client"
  exit 1
}

# Run migrations
echo "🔄 Running database migrations..."
pnpm migrate:deploy || {
  echo "⚠️  Migration deploy failed, trying migrate dev..."
  pnpm migrate || {
    echo "❌ Failed to run migrations"
    echo "⚠️  Continuing anyway, but database may not be set up correctly"
  }
}

# Check migration status
echo "📊 Checking migration status..."
pnpm migrate:status || echo "⚠️  Could not check migration status"

# Navigate back to API directory
cd /app/apps/api

# Clear TypeScript build cache to avoid stale references
echo "🧹 Clearing TypeScript build cache..."
# Try to clear dist contents, but don't fail if it's a volume mount or busy
# Use a subshell to prevent set -e from exiting on error
(
  if [ -d "dist" ]; then
    # Clear contents without removing the directory itself (safer for volume mounts)
    find dist -mindepth 1 -delete 2>/dev/null || true
  fi
) || echo "⚠️  Could not clear dist directory (may be volume mount), continuing anyway..."

# Remove build info files (non-fatal)
rm -f tsconfig.tsbuildinfo .tsbuildinfo 2>/dev/null || true
find . -maxdepth 2 -name "*.tsbuildinfo" -delete 2>/dev/null || true

# Ensure dist directory exists
mkdir -p dist

# Build the project first (ensures dist/main.js exists)
echo "🏗️  Building API..."
pnpm build || {
  echo "⚠️  Initial build failed, but continuing with dev mode..."
  echo "⚠️  Note: First request may fail until build completes"
}

echo "✅ Setup complete! Starting API server..."

# Start the dev server (it will rebuild automatically in watch mode)
exec pnpm dev

