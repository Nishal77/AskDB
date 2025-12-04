-- Add connectionString and anonKey fields to DatabaseConnection
ALTER TABLE "DatabaseConnection" 
ADD COLUMN IF NOT EXISTS "connectionString" TEXT,
ADD COLUMN IF NOT EXISTS "anonKey" TEXT;
