# Database Setup Guide

## 🚨 Current Issue

You're seeing errors like:
- `The table public.User does not exist in the current database`
- `500 Internal Server Error` on `/api/v1/auth/register`, `/api/v1/auth/me`, `/api/v1/admin/connections`

This means **the database migrations haven't been run** on your NeonDB database.

## ✅ Quick Fix

Run these commands to set up your database:

```bash
# Option 1: Use the setup script (recommended)
./scripts/setup-database.sh

# Option 2: Manual setup
pnpm db:setup

# Option 3: Step by step
cd packages/prisma
pnpm generate          # Generate Prisma Client
pnpm migrate:deploy    # Deploy migrations to NeonDB
cd ../..
```

## 📋 Detailed Steps

### 1. Ensure DATABASE_URL is Set

Make sure your `.env` file (in the root directory) contains:

```env
DATABASE_URL="postgresql://neondb_owner:npg_aAXHf6YeI3OD@ep-orange-darkness-a4vv71p4-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

### 2. Generate Prisma Client

```bash
pnpm prisma:generate
# or
cd packages/prisma && pnpm generate
```

### 3. Deploy Migrations

```bash
pnpm migrate
# or
cd packages/prisma && pnpm migrate:deploy
```

This will create all the necessary tables in your NeonDB database:
- `User`
- `DatabaseConnection`
- `QueryHistory`
- `AuditLog`
- `LoginHistory`

### 4. Verify Setup

Check migration status:

```bash
pnpm migrate:status
```

You should see: `Database schema is up to date`

### 5. Restart Your API

After running migrations, restart your API server:

```bash
# Stop the current server (Ctrl+C)
# Then restart
pnpm dev:api
```

## 🔍 Troubleshooting

### Error: "Cannot connect to database"

1. **Check DATABASE_URL**: Ensure it's correct in your `.env` file
2. **Check SSL**: NeonDB requires SSL (`sslmode=require`)
3. **Check Network**: Ensure your IP is allowed in NeonDB dashboard
4. **Check Credentials**: Verify username and password are correct

### Error: "Migration already applied"

This is fine! It means your database is already up to date. You can verify with:

```bash
pnpm migrate:status
```

### Error: "Prisma Client not generated"

Run:

```bash
pnpm prisma:generate
```

## 📚 Available Commands

```bash
# Database setup
pnpm db:setup              # Generate client + deploy migrations

# Migrations
pnpm migrate              # Deploy migrations (production)
pnpm migrate:dev          # Create new migration (development)
pnpm migrate:status       # Check migration status

# Prisma
pnpm prisma:generate       # Generate Prisma Client
```

## 🎯 What Was Fixed

1. **Enhanced PrismaService**: Now validates database schema on startup and provides helpful error messages
2. **Improved Error Handling**: All services now catch database schema errors and provide clear instructions
3. **Better Error Messages**: Users see helpful messages like "Please run migrations: pnpm migrate" instead of cryptic Prisma errors
4. **Database Setup Script**: Created `scripts/setup-database.sh` for easy database initialization

## ✨ Next Steps

After running migrations:

1. ✅ Your database will have all required tables
2. ✅ Registration will work (`/api/v1/auth/register`)
3. ✅ Login will work (`/api/v1/auth/login`)
4. ✅ Profile endpoint will work (`/api/v1/auth/me`)
5. ✅ Connections endpoint will work (`/api/v1/admin/connections`)

## 📝 Notes

- **Never run `migrate:dev` in production** - it creates new migration files
- **Always use `migrate:deploy` in production** - it only applies existing migrations
- The setup script automatically checks if migrations are needed before running them

