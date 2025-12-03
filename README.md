# AskYourDatabase

AI-powered system that lets users query any database using natural language instead of writing SQL.

## 🚀 Quick Start

### 1. Setup Environment Variables

```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env and add your values:
# - OPENROUTER_API_KEY (already set with your key)
# - DATABASE_URL (for Prisma)
# - JWT_SECRET (generate with: openssl rand -base64 32)
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Setup Database

```bash
# Generate Prisma client
cd packages/prisma
pnpm prisma generate

# Run migrations
pnpm prisma migrate dev --name init
```

### 4. Start Development

```bash
# Local development
pnpm dev

# Or with Docker
pnpm docker:dev
```

## 📋 Environment Variables

All environment variables are in the root `.env` file.

**Required Values:**
- `OPENROUTER_API_KEY` - Your OpenRouter API key (already set)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Generate with `openssl rand -base64 32`

## 🏗️ Project Structure

```
askyourdatabase/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # Next.js frontend
├── packages/
│   ├── prisma/       # Database schema
│   ├── types/        # Shared TypeScript types
│   ├── ui/           # Shared UI components
│   └── embeddings/   # Vector operations
└── infra/
    ├── docker/       # Docker configurations
    └── terraform/    # Infrastructure as Code
```

## 📚 Documentation

- `ENV_MASTER_GUIDE.md` - Environment variables guide
- `ENV_REQUIREMENTS.md` - Complete variable list
- `QUICKSTART.md` - Quick start guide
- `ENV_STRATEGY.md` - Why we use a master file

## 🔧 Available Commands

```bash
# Development
pnpm dev              # Start both API and Web
pnpm dev:api          # Start API only
pnpm dev:web          # Start Web only

# Docker
pnpm docker:dev       # Development with Docker
pnpm docker:prod      # Production with Docker
pnpm docker:logs      # View logs

# Setup
pnpm setup:env        # Create all .env files
```

## 🌐 Services

- **API:** http://localhost:3000/api/v1
- **Web:** http://localhost:3001
- **Health:** http://localhost:3000/health

## 📝 License

Private

