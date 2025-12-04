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
# Quick setup (recommended)
pnpm db:setup

# Or manually:
pnpm prisma:generate  # Generate Prisma Client
pnpm migrate          # Deploy migrations to database
```

**⚠️ Important:** If you see errors like "table does not exist", run `pnpm db:setup` first.

See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed instructions.

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

- `DOCKER_SETUP.md` - **Docker setup guide (everything automated!)** ⭐
- `DATABASE_SETUP.md` - Database setup and migration guide
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

# Docker (Everything automated! 🚀)
pnpm docker:dev       # Start everything: DB, migrations, API, Web (all automated)
pnpm docker:dev:down  # Stop all services
pnpm docker:prod      # Production with Docker
pnpm docker:logs      # View logs
pnpm docker:clean     # Clean everything (removes volumes)

# Setup
pnpm setup:env        # Create all .env files
pnpm db:setup        # Setup database (generate client + run migrations)

# Database
pnpm migrate         # Deploy migrations (production)
pnpm migrate:dev     # Create new migration (development)
pnpm migrate:status  # Check migration status
pnpm prisma:generate # Generate Prisma Client
```

## 🌐 Services

- **API:** http://localhost:3000/api/v1
- **Web:** http://localhost:3001
- **Health:** http://localhost:3000/health

## 📝 License

Private

