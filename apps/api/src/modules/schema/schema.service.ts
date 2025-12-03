import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { Pool } from 'pg';
// import { getVectorDbConfig } from '../../config/database.config'; // Reserved for future use

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
  // private pgPool: Pool; // Reserved for future vector operations

  constructor(private prisma: PrismaService) {
    // Vector DB pool initialization reserved for future use
    // const config = getVectorDbConfig();
    // this.pgPool = new Pool({
    //   host: config.host,
    //   port: config.port,
    //   database: config.database,
    //   user: config.user,
    //   password: config.password,
    // });
  }

  async getDatabaseMetadata(connectionId: string): Promise<TableMetadata[]> {
    // Get connection details from database
    const connection = await this.prisma.databaseConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new Error('Database connection not found');
    }

    // Connect to the user's database
    const userPool = new Pool({
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.username,
      password: connection.password,
    });

    try {
      const tables = await this.getTables(userPool);
      const metadata: TableMetadata[] = [];

      for (const table of tables) {
        const columns = await this.getColumns(userPool, table);
        const primaryKeys = await this.getPrimaryKeys(userPool, table);
        const foreignKeys = await this.getForeignKeys(userPool, table);
        const indexes = await this.getIndexes(userPool, table);

        metadata.push({
          tableName: table,
          columns,
          primaryKeys,
          foreignKeys,
          indexes,
        });
      }

      return metadata;
    } finally {
      await userPool.end();
    }
  }

  private async getTables(pool: Pool): Promise<string[]> {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    return result.rows.map((row) => row.table_name);
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
      SELECT column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = $1
        AND tc.constraint_type = 'PRIMARY KEY'
      ORDER BY kcu.ordinal_position;
    `,
      [tableName],
    );
    return result.rows.map((row) => row.column_name);
  }

  private async getForeignKeys(
    pool: Pool,
    tableName: string,
  ): Promise<ForeignKeyMetadata[]> {
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
        i.indexname AS index_name,
        array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) AS column_names,
        i.indexdef LIKE '%UNIQUE%' AS is_unique
      FROM pg_indexes i
      JOIN pg_index ix ON i.indexname = (SELECT relname FROM pg_class WHERE oid = ix.indexrelid)
      JOIN pg_attribute a ON a.attrelid = ix.indrelid AND a.attnum = ANY(ix.indkey)
      WHERE i.tablename = $1
      GROUP BY i.indexname, i.indexdef;
    `,
      [tableName],
    );
    return result.rows.map((row) => ({
      indexName: row.index_name,
      columnNames: row.column_names,
      isUnique: row.is_unique,
    }));
  }
}

