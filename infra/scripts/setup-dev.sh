#!/bin/bash

set -e

echo "🔧 Setting up development environment..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Installing..."
    npm install -g pnpm@8.15.0
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Setup Prisma
echo "🗄️  Setting up Prisma..."
cd packages/prisma
pnpm prisma generate
cd ../..

# Start PostgreSQL with Docker
echo "🐳 Starting PostgreSQL..."
docker-compose -f infra/docker/docker-compose.yml up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
sleep 5

# Run migrations
echo "🔄 Running migrations..."
cd packages/prisma
pnpm prisma migrate dev --name init || true
cd ../..

echo "✅ Development environment setup complete!"
echo "📝 To start the apps:"
echo "   pnpm dev:api  # Start API"
echo "   pnpm dev:web  # Start Web"

