#!/bin/bash

set -e

echo "Setting up environment variables for AskYourDatabase..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.example exists
if [ ! -f ".env.example" ]; then
    echo -e "${YELLOW}Warning:${NC} .env.example not found in root directory"
    exit 1
fi

# Create .env from .env.example if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${GREEN}Creating .env from .env.example...${NC}"
    cp .env.example .env
    echo "Created: .env"
    echo ""
    echo -e "${YELLOW}Please edit .env and add your actual values:${NC}"
    echo "  - OPENROUTER_API_KEY (already set with your key)"
    echo "  - DATABASE_URL"
    echo "  - JWT_SECRET (generate with: openssl rand -base64 32)"
else
    echo -e "${YELLOW}Warning:${NC} .env already exists, skipping..."
fi

echo ""
echo -e "${GREEN}Environment setup complete!${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Verify .env file has your values:"
echo "   ${YELLOW}cat .env${NC}"
echo ""
echo "2. Start the application:"
echo "   ${YELLOW}pnpm dev${NC} (local) or ${YELLOW}pnpm docker:dev${NC} (Docker)"
echo ""
