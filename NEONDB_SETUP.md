# NeonDB Setup Guide

## ✅ Configuration Complete

Prisma is now configured to use NeonDB as the primary database.

## Connection String

```
postgresql://neondb_owner:npg_aAXHf6YeI3OD@ep-orange-darkness-a4vv71p4-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

## Files Updated

1. **`packages/prisma/.env`**
   - Contains `DATABASE_URL` pointing to NeonDB
   - Used by Prisma CLI commands

2. **`.env` (root)**
   - Contains `DATABASE_URL` for application use
   - Used by NestJS API

3. **`infra/docker/docker-compose.dev.yml`**
   - Updated to use NeonDB `DATABASE_URL` from environment
   - Falls back to NeonDB connection string if not set

## Next Steps

### 1. Run Migrations

```bash
# Inside Docker container
docker exec askdb-api-dev pnpm --filter @askdb/prisma migrate deploy

# Or locally (if you have DATABASE_URL set)
pnpm --filter @askdb/prisma migrate deploy
```

### 2. Generate Prisma Client

```bash
# Inside Docker container
docker exec askdb-api-dev pnpm --filter @askdb/prisma generate

# Or locally
pnpm --filter @askdb/prisma generate
```

### 3. Restart Services

```bash
# Restart Docker containers to apply new DATABASE_URL
docker-compose -f infra/docker/docker-compose.dev.yml restart api
```

## Verify Connection

Test the connection:

```bash
# Test Prisma connection
docker exec askdb-api-dev pnpm --filter @askdb/prisma db pull
```

## Important Notes

- ✅ NeonDB uses SSL (sslmode=require)
- ✅ Connection pooling is enabled (pooler endpoint)
- ✅ All Prisma operations will now use NeonDB
- ✅ Local PostgreSQL container can be stopped if not needed

## Troubleshooting

If you encounter connection issues:

1. **Check SSL**: NeonDB requires SSL connections
2. **Check credentials**: Verify username and password are correct
3. **Check network**: Ensure your IP is allowed in NeonDB dashboard
4. **Check pooler**: The connection string uses the pooler endpoint

## Migration from Local PostgreSQL

If you were using local PostgreSQL:

1. ✅ Data is now stored in NeonDB
2. ✅ All new data goes to NeonDB
3. ⚠️ Old local data remains in local PostgreSQL (if you want to migrate, use pg_dump/pg_restore)

