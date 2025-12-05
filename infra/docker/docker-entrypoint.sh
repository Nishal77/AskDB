#!/bin/bash
set -e

echo "[INFO] Starting AskYourDatabase API setup..."

# Wait for database to be ready (if using local postgres container)
if [ -n "$VECTOR_DB_HOST" ] && [ "$VECTOR_DB_HOST" = "postgres" ]; then
  echo "[INFO] Waiting for PostgreSQL container to be ready..."
  if command -v pg_isready >/dev/null 2>&1; then
    until pg_isready -h "$VECTOR_DB_HOST" -p "${VECTOR_DB_PORT:-5432}" -U "$VECTOR_DB_USER" 2>/dev/null; do
      echo "[INFO] Database not ready, waiting..."
      sleep 2
    done
    echo "[INFO] Database is ready"
  else
    echo "[WARN] pg_isready not available, skipping wait (assuming database is ready)"
    sleep 3
  fi
else
  echo "[INFO] Using external database, skipping local DB wait"
fi

# Navigate to workspace root
cd /app

# Generate Prisma Client
echo "[INFO] Generating Prisma Client..."
cd packages/prisma
if ! pnpm generate; then
  echo "[ERROR] Failed to generate Prisma Client"
  exit 1
fi

# Run database migrations
echo "[INFO] Running database migrations..."
if ! pnpm migrate:deploy; then
  echo "[WARN] Migration deploy failed, trying migrate dev..."
  if ! pnpm migrate; then
    echo "[ERROR] Failed to run migrations"
    echo "[WARN] Continuing anyway, but database may not be set up correctly"
  fi
fi

# Check migration status
echo "[INFO] Checking migration status..."
pnpm migrate:status || echo "[WARN] Could not check migration status"

# Navigate to API directory
cd /app/apps/api

# Clear TypeScript build cache
echo "[INFO] Clearing TypeScript build cache..."
if [ -d "dist" ]; then
  find dist -mindepth 1 -delete 2>/dev/null || true
fi

# Remove build info files
rm -f tsconfig.tsbuildinfo .tsbuildinfo 2>/dev/null || true
find . -maxdepth 2 -name "*.tsbuildinfo" -delete 2>/dev/null || true

# Ensure dist directory exists
mkdir -p dist

# Build the project
echo "[INFO] Building API..."
if ! pnpm build; then
  echo "[WARN] Initial build failed, but continuing with dev mode"
  echo "[WARN] Note: First request may fail until build completes"
fi

echo "[INFO] Setup complete. Starting API server..."

# Start the dev server (watch mode)
exec pnpm dev

