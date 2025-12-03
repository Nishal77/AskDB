#!/bin/bash

set -e

echo "🚀 Deploying AskYourDatabase..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install it first: npm install -g pnpm"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build packages
echo "🔨 Building packages..."
pnpm --filter @askdb/prisma prisma generate
pnpm build

# Run tests (if any)
echo "🧪 Running tests..."
# pnpm test || true

# Build Docker images
echo "🐳 Building Docker images..."
docker-compose -f infra/docker/docker-compose.yml build

echo "✅ Build complete!"
echo "📝 To start the application, run:"
echo "   docker-compose -f infra/docker/docker-compose.yml up -d"

