# AskYourDatabase API

NestJS backend for AskYourDatabase - an AI-powered system that translates natural language queries into SQL.

## Architecture

The API is built with NestJS and follows a modular architecture:

- **Auth Module**: User authentication and authorization (JWT)
- **Schema Module**: Database schema introspection and vector embeddings
- **LLM Module**: OpenAI integration for NL-to-SQL conversion and SQL explanation
- **Query Module**: SQL execution and query history management
- **Insights Module**: AI-powered data analysis and insights generation
- **Admin Module**: Database connection management
- **Logging Module**: Audit logging and request tracking

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Set up Prisma:
```bash
# Generate Prisma client
npx prisma generate

# Run migrations (when schema is ready)
npx prisma migrate dev
```

4. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000/api/v1`

## Environment Variables

See `.env.example` for all required environment variables.

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user profile

### Database Connections (Admin)
- `POST /api/v1/admin/connections` - Create a database connection
- `GET /api/v1/admin/connections` - List all connections
- `GET /api/v1/admin/connections/:id` - Get connection details
- `PUT /api/v1/admin/connections/:id` - Update connection
- `DELETE /api/v1/admin/connections/:id` - Delete connection
- `POST /api/v1/admin/connections/test` - Test connection

### Schema
- `GET /api/v1/schema/connection/:connectionId` - Get database schema
- `GET /api/v1/schema/connection/:connectionId/embed` - Embed schema for vector search

### Query
- `POST /api/v1/query/execute` - Execute a natural language query
- `GET /api/v1/query/history` - Get query history
- `GET /api/v1/query/history/:id` - Get specific query

## Security Features

- JWT-based authentication
- SQL injection protection via guardrails
- Only SELECT queries allowed (no destructive operations)
- Input validation and sanitization
- Audit logging for all requests

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm run start:prod

# Run tests
npm test
```

