import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { Pool } from 'pg';

export interface TableMetadata {
  tableName: string;
  columns: ColumnMetadata[];
  primaryKeys: string[];
  foreignKeys: ForeignKeyMetadata[];
  indexes: IndexMetadata[];
}

export interface ColumnMetadata {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  defaultValue: any;
  characterMaximumLength?: number;
}

export interface ForeignKeyMetadata {
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface IndexMetadata {
  indexName: string;
  columnNames: string[];
  isUnique: boolean;
}

@Injectable()
export class SchemaService {
  constructor(private prisma: PrismaService) {}

  async getDatabaseMetadata(connectionId: string): Promise<TableMetadata[]> {
    // Get connection details from database
    const connection = await this.prisma.databaseConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new Error('Connection not found');
    }

    // Determine if SSL is required based on host
    const requiresSsl = connection.host.includes('neon.tech') || 
                        connection.host.includes('supabase.co') ||
                        connection.host.includes('aws.') ||
                        connection.host.includes('cloud.') ||
                        connection.host.includes('amazonaws.com') ||
                        connection.host.includes('pooler.');

    console.log(`🔍 Fetching database metadata for connection: ${connection.name}`);

    // Connect to the user's database
    const userPool = new Pool({
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.username,
      password: connection.password,
      ssl: requiresSsl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000, // 10 second timeout
    });

    try {
      // Test connection first
      await userPool.query('SELECT 1');
      
      const tables = await this.getTables(userPool);
      const metadata: TableMetadata[] = [];

      for (const tableName of tables) {
        try {
          const columns = await this.getColumns(userPool, tableName);
          const primaryKeys = await this.getPrimaryKeys(userPool, tableName);
          const foreignKeys = await this.getForeignKeys(userPool, tableName);
          const indexes = await this.getIndexes(userPool, tableName);

          metadata.push({
            tableName,
            columns,
            primaryKeys,
            foreignKeys,
            indexes,
          });
        } catch (error: any) {
          console.error(`Error fetching metadata for table "${tableName}":`, error.message);
          // Continue with other tables even if one fails
        }
      }

      return metadata;
    } catch (error: any) {
      console.error('❌ Error fetching database metadata:', error);
      throw new Error(`Failed to fetch database metadata: ${error.message}`);
    } finally {
      await userPool.end();
    }
  }

  async getTablesWithRowCounts(connectionId: string): Promise<Array<{ tableName: string; rowCount: number }>> {
    // Get connection details from database
    const connection = await this.prisma.databaseConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new Error('Connection not found');
    }

    // Determine if SSL is required based on host
    const requiresSsl = connection.host.includes('neon.tech') || 
                        connection.host.includes('supabase.co') ||
                        connection.host.includes('aws.') ||
                        connection.host.includes('cloud.') ||
                        connection.host.includes('amazonaws.com') ||
                        connection.host.includes('pooler.');

    console.log(`🔍 Fetching tables for connection: ${connection.name}`);
    console.log(`   Host: ${connection.host}:${connection.port}`);
    console.log(`   Database: ${connection.database}`);
    console.log(`   SSL Required: ${requiresSsl}`);

    // Connect to the user's database
    const userPool = new Pool({
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.username,
      password: connection.password,
      ssl: requiresSsl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000, // 10 second timeout
    });

    try {
      // Test connection first
      await userPool.query('SELECT 1');
      console.log('✅ Database connection successful');

      const tables = await this.getTables(userPool);
      console.log(`📊 Found ${tables.length} tables:`, tables);

      const tablesWithCounts: Array<{ tableName: string; rowCount: number }> = [];

      for (const table of tables) {
        try {
          // Use proper identifier quoting for table names to handle special characters
          const result = await userPool.query(`SELECT COUNT(*) as count FROM ${this.quoteIdentifier(table)}`);
          const rowCount = parseInt(result.rows[0].count, 10);
          tablesWithCounts.push({
            tableName: table,
            rowCount,
          });
          console.log(`   ✓ ${table}: ${rowCount} rows`);
        } catch (error: any) {
          console.error(`   ✗ Error counting rows for table "${table}":`, error.message);
          // If counting fails (e.g., permission issue), set to -1 but still include the table
          tablesWithCounts.push({
            tableName: table,
            rowCount: -1,
          });
        }
      }

      console.log(`✅ Returning ${tablesWithCounts.length} tables with row counts`);
      return tablesWithCounts;
    } catch (error: any) {
      console.error('❌ Error fetching tables:', error);
      throw new Error(`Failed to fetch tables: ${error.message}`);
    } finally {
      await userPool.end();
    }
  }

  private async getTables(pool: Pool): Promise<string[]> {
    try {
      // Get only user-created tables, exclude system tables
      // Note: We exclude pg_* tables but allow user tables that might start with underscore
      const result = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE 'pg_%'
        AND table_name NOT IN ('_prisma_migrations', '_prisma_migrations_lock')
        ORDER BY table_name;
      `);
      
      const tables = result.rows.map((row) => row.table_name);
      console.log(`📋 Query returned ${tables.length} tables from information_schema`);
      return tables;
    } catch (error: any) {
      console.error('❌ Error querying information_schema.tables:', error);
      throw new Error(`Failed to query tables: ${error.message}`);
    }
  }

  /**
   * Properly quote PostgreSQL identifiers to handle special characters
   */
  private quoteIdentifier(identifier: string): string {
    // Replace double quotes with escaped double quotes and wrap in quotes
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  private async getColumns(pool: Pool, tableName: string): Promise<ColumnMetadata[]> {
    const result = await pool.query(
      `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `,
      [tableName],
    );

    return result.rows.map((row) => ({
      columnName: row.column_name,
      dataType: row.data_type,
      isNullable: row.is_nullable === 'YES',
      defaultValue: row.column_default,
      characterMaximumLength: row.character_maximum_length,
    }));
  }

  private async getPrimaryKeys(pool: Pool, tableName: string): Promise<string[]> {
    const result = await pool.query(
      `
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = $1;
    `,
      [tableName],
    );

    return result.rows.map((row) => row.column_name);
  }

  private async getForeignKeys(pool: Pool, tableName: string): Promise<ForeignKeyMetadata[]> {
    const result = await pool.query(
      `
      SELECT
        kcu.column_name,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = $1;
    `,
      [tableName],
    );

    return result.rows.map((row) => ({
      columnName: row.column_name,
      referencedTable: row.referenced_table,
      referencedColumn: row.referenced_column,
    }));
  }

  private async getIndexes(pool: Pool, tableName: string): Promise<IndexMetadata[]> {
    const result = await pool.query(
      `
      SELECT
        i.relname AS index_name,
        array_agg(a.attname ORDER BY k.n) AS column_names,
        ix.indisunique AS is_unique
      FROM pg_index ix
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS k(attnum, n) ON true
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
      WHERE n.nspname = 'public'
        AND t.relname = $1
        AND NOT ix.indisprimary
      GROUP BY i.relname, ix.indisunique;
    `,
      [tableName],
    );

    return result.rows.map((row) => {
      // Ensure column_names is always an array
      // PostgreSQL array_agg returns an array, but handle edge cases
      let columnNames: string[] = [];
      if (Array.isArray(row.column_names)) {
        columnNames = row.column_names;
      } else if (row.column_names) {
        // If it's a string representation of an array, parse it
        columnNames = [row.column_names];
      }

      return {
        indexName: row.index_name,
        columnNames,
        isUnique: row.is_unique,
      };
    });
  }
}
