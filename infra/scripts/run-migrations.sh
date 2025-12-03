#!/bin/bash

set -e

echo "🔄 Running Prisma migrations..."

# Navigate to prisma package
cd "$(dirname "$0")/../../packages/prisma"

# Check if .env exists
if [ ! -f .env ] && [ -f ../../.env ]; then
  echo "📝 Creating .env symlink from root..."
  ln -sf ../../.env .env
fi

# Run migrations
echo "🚀 Executing migrations..."
pnpm migrate deploy || pnpm migrate dev --name init

echo "✅ Migrations completed!"


