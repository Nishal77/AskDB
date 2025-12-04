#!/bin/bash

set -e

echo "🗄️  Setting up database..."

# Navigate to prisma package
cd "$(dirname "$0")/../packages/prisma"

# Check if .env exists
if [ ! -f .env ] && [ -f ../../.env ]; then
  echo "📝 Creating .env symlink from root..."
  ln -sf ../../.env .env
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ] && [ -f .env ]; then
  echo "📝 Loading DATABASE_URL from .env..."
  export $(grep -v '^#' .env | grep DATABASE_URL | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL is not set!"
  echo "Please set DATABASE_URL in your .env file or environment variables."
  exit 1
fi

echo "✅ DATABASE_URL is configured"

# Generate Prisma Client
echo "🔨 Generating Prisma Client..."
pnpm generate

# Check migration status
echo "📊 Checking migration status..."
if pnpm migrate:status 2>&1 | grep -q "Database schema is up to date"; then
  echo "✅ Database schema is up to date"
else
  echo "🔄 Database schema needs updates. Running migrations..."
  pnpm migrate:deploy
fi

echo "✅ Database setup complete!"

