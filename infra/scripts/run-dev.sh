#!/bin/bash

set -e

echo "🚀 Starting AskYourDatabase Development Environment..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Installing..."
    npm install -g pnpm@8.15.0
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your actual values before continuing"
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
docker-compose -f infra/docker/docker-compose.dev.yml up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Run migrations
echo "🔄 Running migrations..."
cd packages/prisma
pnpm prisma migrate dev --name init || echo "Migrations may already exist"
cd ../..

echo "✅ Development environment ready!"
echo ""
echo "📝 To start the applications:"
echo "   pnpm dev              # Start both API and Web"
echo "   pnpm dev:api          # Start API only"
echo "   pnpm dev:web          # Start Web only"
echo ""
echo "🌐 Services will be available at:"
echo "   API:  http://localhost:3000/api/v1"
echo "   Web:  http://localhost:3001"
echo "   DB:   localhost:5432"

