# Docker Development Setup

## 🚀 Quick Start

Run a single command to start everything:

```bash
pnpm docker:dev
```

This single command will:
1. ✅ Build all Docker containers
2. ✅ Start PostgreSQL database
3. ✅ Generate Prisma Client
4. ✅ Run database migrations automatically
5. ✅ Build the API
6. ✅ Start API server in watch mode
7. ✅ Start Web server in watch mode

## 📋 What Happens Automatically

When you run `pnpm docker:dev`, the entrypoint script (`infra/docker/docker-entrypoint.sh`) automatically:

1. **Waits for Database**: If using local PostgreSQL, waits for it to be ready
2. **Generates Prisma Client**: Ensures `@prisma/client` is generated
3. **Runs Migrations**: Deploys all pending migrations to the database
4. **Checks Migration Status**: Verifies migrations were applied successfully
5. **Builds API**: Creates the `dist` folder with compiled code
6. **Starts Dev Server**: Launches NestJS in watch mode

## 🐳 Services

After running `pnpm docker:dev`, you'll have:

- **API**: http://localhost:3000/api/v1
- **Web**: http://localhost:3001
- **PostgreSQL**: localhost:5432 (if using local DB)
- **Health Check**: http://localhost:3000/health

## 🔧 Available Commands

```bash
# Start everything
pnpm docker:dev

# Stop everything
pnpm docker:dev:down

# View logs
pnpm docker:logs

# Clean everything (removes volumes)
pnpm docker:clean

# Rebuild and start
pnpm docker:dev
```

## 🗄️ Database Configuration

### Using NeonDB (Cloud)

Set `DATABASE_URL` in your `.env` file:

```env
DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"
```

The entrypoint script will automatically:
- Skip waiting for local PostgreSQL
- Connect directly to NeonDB
- Run migrations on NeonDB

### Using Local PostgreSQL

The docker-compose file includes a PostgreSQL container. The entrypoint script will:
- Wait for PostgreSQL to be ready
- Run migrations on the local database
- Use the local database for all operations

## 🐛 Troubleshooting

### Error: "Cannot find module dist/main"

This means the build didn't complete. The entrypoint script now:
- Creates the `dist` directory
- Runs `pnpm build` before starting the dev server
- Ensures the build completes before starting

### Error: "Database schema not initialized"

The entrypoint script automatically runs migrations. If you see this error:
1. Check the container logs: `pnpm docker:logs`
2. Look for migration errors in the logs
3. Manually run migrations: `docker exec askdb-api-dev pnpm --filter @askdb/prisma migrate:deploy`

### Error: "Prisma Client not generated"

The entrypoint script generates Prisma Client automatically. If it fails:
1. Check the container logs
2. Manually generate: `docker exec askdb-api-dev pnpm --filter @askdb/prisma generate`

### Rebuilding After Changes

If you make changes to:
- **Dockerfile**: Run `pnpm docker:dev` (it will rebuild)
- **Source code**: Changes are hot-reloaded automatically (volumes are mounted)
- **Schema changes**: Restart the container to regenerate Prisma Client

## 📝 Notes

- **Volumes**: Source code is mounted, so changes are reflected immediately
- **Hot Reload**: Both API and Web support hot reload in dev mode
- **Database**: Migrations run automatically on container start
- **Build**: Initial build happens automatically, then watch mode takes over

## 🎯 What's Different

Previously, you had to manually:
1. Run `pnpm prisma:generate`
2. Run `pnpm migrate`
3. Build the API
4. Start services

Now, **everything happens automatically** when you run `pnpm docker:dev`! 🎉

