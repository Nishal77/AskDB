#!/bin/bash

set -e

MODE=${1:-dev}

echo "🐳 Starting AskYourDatabase with Docker ($MODE mode)..."

if [ "$MODE" = "prod" ]; then
    # Check if .env file exists
    if [ ! -f infra/docker/.env ]; then
        echo "📝 Creating .env file from .env.example..."
        cp infra/docker/.env.example infra/docker/.env
        echo "⚠️  Please update infra/docker/.env with your actual values before continuing"
        exit 1
    fi
    
    echo "🚀 Starting production environment..."
    docker-compose -f infra/docker/docker-compose.yml --env-file infra/docker/.env up --build -d
    
    echo "✅ Production environment started!"
    echo ""
    echo "📝 To view logs:"
    echo "   pnpm docker:logs"
    echo ""
    echo "📝 To stop:"
    echo "   pnpm docker:prod:down"
else
    echo "🚀 Starting development environment..."
    docker-compose -f infra/docker/docker-compose.dev.yml up --build
    
    echo "✅ Development environment started!"
    echo ""
    echo "📝 To stop:"
    echo "   pnpm docker:dev:down"
fi

echo ""
echo "🌐 Services will be available at:"
echo "   API:  http://localhost:3000/api/v1"
echo "   Web:  http://localhost:3001"
echo "   DB:   localhost:5432"

