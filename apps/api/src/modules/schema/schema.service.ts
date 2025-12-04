import { Injectable, BadRequestException } from '@nestjs/common';
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
  defaultValue: unknown;
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

export interface TableWithRowCount {
  tableName: string;
  rowCount: number;
}

const SSL_REQUIRED_HOSTS = [
  'neon.tech',
  'supabase.co',
  'aws.',
  'cloud.',
  'amazonaws.com',
  'pooler.',
] as const;

const CONNECTION_TIMEOUT_MS = 10000;
const ERROR_ROW_COUNT = -1;

@Injectable()
export class SchemaService {
  constructor(private readonly prisma: PrismaService) {}

  async getDatabaseMetadata(connectionId: string): Promise<TableMetadata[]> {
    const connection = await this.getConnection(connectionId);
    const pool = this.createPool(connection);

    try {
      await this.testConnection(pool);
      const tables = await this.getTables(pool);
      return await this.buildMetadata(pool, tables);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to fetch database metadata: ${message}`);
    } finally {
      await pool.end();
    }
  }

  async getTablesWithRowCounts(connectionId: string): Promise<TableWithRowCount[]> {
    const connection = await this.getConnection(connectionId);
    const pool = this.createPool(connection);

    try {
      await this.testConnection(pool);
      const tables = await this.getTables(pool);
      return await this.getRowCounts(pool, tables);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to fetch tables: ${message}`);
    } finally {
      await pool.end();
    }
  }

  private async getConnection(connectionId: string) {
    const connection = await this.prisma.databaseConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new BadRequestException('Connection not found');
    }

    return connection;
  }

  private determineSslRequirement(host: string): boolean {
    return SSL_REQUIRED_HOSTS.some((requiredHost) => host.includes(requiredHost));
  }

  private createPool(connection: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  }): Pool {
    const requiresSsl = this.determineSslRequirement(connection.host);

    return new Pool({
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.username,
      password: connection.password,
      ssl: requiresSsl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    });
  }

  private async testConnection(pool: Pool): Promise<void> {
    await pool.query('SELECT 1');
  }

  private async getTables(pool: Pool): Promise<string[]> {
      const result = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE 'pg_%'
        AND table_name NOT IN ('_prisma_migrations', '_prisma_migrations_lock')
        ORDER BY table_name;
      `);
      
    return result.rows.map((row) => row.table_name);
  }

  private async buildMetadata(pool: Pool, tables: string[]): Promise<TableMetadata[]> {
    const metadata: TableMetadata[] = [];

    for (const tableName of tables) {
      try {
        const [columns, primaryKeys, foreignKeys, indexes] = await Promise.all([
          this.getColumns(pool, tableName),
          this.getPrimaryKeys(pool, tableName),
          this.getForeignKeys(pool, tableName),
          this.getIndexes(pool, tableName),
        ]);

        metadata.push({
          tableName,
          columns,
          primaryKeys,
          foreignKeys,
          indexes,
        });
      } catch {
        // Continue with other tables even if one fails
      }
    }

    return metadata;
  }

  private async getRowCounts(pool: Pool, tables: string[]): Promise<TableWithRowCount[]> {
    const tablesWithCounts: TableWithRowCount[] = [];

    for (const table of tables) {
      try {
        const result = await pool.query(
          `SELECT COUNT(*) as count FROM ${this.quoteIdentifier(table)}`,
        );
        const rowCount = parseInt(result.rows[0].count, 10);
        tablesWithCounts.push({ tableName: table, rowCount });
      } catch {
        tablesWithCounts.push({ tableName: table, rowCount: ERROR_ROW_COUNT });
      }
    }

    return tablesWithCounts;
  }

  private quoteIdentifier(identifier: string): string {
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
      const columnNames = Array.isArray(row.column_names)
        ? row.column_names
        : row.column_names
          ? [row.column_names]
          : [];

      return {
        indexName: row.index_name,
        columnNames,
        isUnique: row.is_unique,
      };
    });
  }
}
