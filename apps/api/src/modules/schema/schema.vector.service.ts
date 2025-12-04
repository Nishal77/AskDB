import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { getVectorDbConfig } from '../../config/database.config';
import { TableMetadata } from './schema.service';

@Injectable()
export class SchemaVectorService {
  private pgPool: Pool;

  constructor() {
    const config = getVectorDbConfig();
    this.pgPool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
    });
  }

  async initializeVectorExtension() {
    await this.pgPool.query('CREATE EXTENSION IF NOT EXISTS vector;');
  }

  async createSchemaEmbeddingsTable() {
    await this.pgPool.query(`
      CREATE TABLE IF NOT EXISTS schema_embeddings (
        id SERIAL PRIMARY KEY,
        connection_id VARCHAR(255) NOT NULL,
        table_name VARCHAR(255) NOT NULL,
        schema_text TEXT NOT NULL,
        embedding vector(1536),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create index for vector similarity search
    await this.pgPool.query(`
      CREATE INDEX IF NOT EXISTS schema_embeddings_vector_idx 
      ON schema_embeddings 
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `);
  }

  async storeSchemaEmbedding(
    connectionId: string,
    tableName: string,
    schemaText: string,
    embedding: number[],
  ) {
    await this.pgPool.query(
      `
      INSERT INTO schema_embeddings (connection_id, table_name, schema_text, embedding)
      VALUES ($1, $2, $3, $4::vector)
      ON CONFLICT (connection_id, table_name) 
      DO UPDATE SET 
        schema_text = EXCLUDED.schema_text,
        embedding = EXCLUDED.embedding,
        updated_at = NOW();
    `,
      [connectionId, tableName, schemaText, `[${embedding.join(',')}]`],
    );
  }

  async findSimilarSchemas(
    queryEmbedding: number[],
    connectionId: string,
    limit: number = 5,
  ): Promise<any[]> {
    const result = await this.pgPool.query(
      `
      SELECT 
        table_name,
        schema_text,
        1 - (embedding <=> $1::vector) AS similarity
      FROM schema_embeddings
      WHERE connection_id = $2
      ORDER BY embedding <=> $1::vector
      LIMIT $3;
    `,
      [`[${queryEmbedding.join(',')}]`, connectionId, limit],
    );

    return result.rows;
  }

  async generateSchemaText(metadata: TableMetadata): Promise<string> {
    const parts: string[] = [];

    parts.push(`Table: ${metadata.tableName}`);

    // Columns
    parts.push('Columns:');
    metadata.columns.forEach((col) => {
      const nullable = col.isNullable ? 'nullable' : 'not null';
      const length = col.characterMaximumLength
        ? `(${col.characterMaximumLength})`
        : '';
      parts.push(`  - ${col.columnName}: ${col.dataType}${length} ${nullable}`);
    });

    // Primary keys
    if (metadata.primaryKeys.length > 0) {
      parts.push(`Primary Key: ${metadata.primaryKeys.join(', ')}`);
    }

    // Foreign keys
    if (metadata.foreignKeys.length > 0) {
      parts.push('Foreign Keys:');
      metadata.foreignKeys.forEach((fk) => {
        parts.push(
          `  - ${fk.columnName} -> ${fk.referencedTable}.${fk.referencedColumn}`,
        );
      });
    }

    // Indexes
    if (metadata.indexes.length > 0) {
      parts.push('Indexes:');
      metadata.indexes.forEach((idx) => {
        const unique = idx.isUnique ? 'UNIQUE ' : '';
        // Ensure columnNames is an array before calling join
        const columnNames = Array.isArray(idx.columnNames) 
          ? idx.columnNames 
          : (idx.columnNames ? [idx.columnNames] : []);
        const columnsStr = columnNames.length > 0 
          ? columnNames.join(', ') 
          : 'unknown';
        parts.push(
          `  - ${unique}${idx.indexName} on (${columnsStr})`,
        );
      });
    }

    return parts.join('\n');
  }
}

