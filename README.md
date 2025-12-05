# AskYourDatabase

AI-powered system that enables users to query databases using natural language instead of writing SQL queries.

## Demo Video

[Watch Demo Video →](demo/demo.MOV)

*Note: GitHub README files don't support embedded video playback. Click the link above to view or download the video. For better browser compatibility, consider converting to MP4 format.*

## Prerequisites

- Node.js 18+ and pnpm 8+
- PostgreSQL database
- OpenRouter API key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Nishal77/AskDB.git
cd Askyourdatabase
```

2. Install dependencies:
```bash
pnpm install
```

3. Setup environment variables:
```bash
pnpm setup:env
```

4. Configure environment variables:
Edit the `.env` file in the root directory and set the following required values:
- `OPENROUTER_API_KEY` - Your OpenRouter API key
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Generate a secret key using: `openssl rand -base64 32`

5. Setup database:
```bash
pnpm db:setup
```

## Running the Application

### Local Development

Start both API and web services:
```bash
pnpm dev
```

Start services individually:
```bash
pnpm dev:api    # API only
pnpm dev:web    # Web only
```

### Docker

Start all services with Docker:
```bash
pnpm docker:dev
```

Stop Docker services:
```bash
pnpm docker:dev:down
```

## Prisma Commands

### Database Setup
```bash
# Generate Prisma Client and run migrations
pnpm db:setup
```

### Generate Prisma Client
```bash
pnpm prisma:generate
```

### Database Migrations
```bash
# Deploy migrations (production)
pnpm migrate

# Create new migration (development)
pnpm migrate:dev

# Check migration status
pnpm migrate:status
```

### Prisma Studio (Database GUI)
```bash
cd packages/prisma
pnpm prisma studio
```

## API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication Endpoints

- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login and get JWT token
- `GET /api/v1/auth/me` - Get current user profile (requires authentication)
- `POST /api/v1/auth/openrouter-key` - Update OpenRouter API key (requires authentication)
- `DELETE /api/v1/auth/openrouter-key` - Remove OpenRouter API key (requires authentication)

### Query Endpoints

- `POST /api/v1/query/execute` - Execute natural language query (requires authentication)
- `GET /api/v1/query/history` - Get query history (requires authentication)
- `GET /api/v1/query/history/:id` - Get specific query by ID (requires authentication)

### Schema Endpoints

- `GET /api/v1/schema/connection/:connectionId` - Get database schema (requires authentication)
- `GET /api/v1/schema/connection/:connectionId/embed` - Get schema for embedding (requires authentication)
- `GET /api/v1/schema/connection/:connectionId/tables` - Get tables with row counts (requires authentication)

### Admin Endpoints

- `GET /api/v1/admin/connections` - Get all database connections (requires authentication)

### Health Check

- `GET /health` - Health check endpoint (no authentication required)
- `GET /api/v1/health` - Health check with API prefix (no authentication required)

### Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Services and Ports

- **API Server**: http://localhost:3000/api/v1
- **Web Application**: http://localhost:3001
- **Health Check**: http://localhost:3000/health


## License

Private
