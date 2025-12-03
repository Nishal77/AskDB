import OpenAI from 'openai';
import { Pool } from 'pg';

export interface EmbeddingConfig {
  openaiApiKey: string;
  vectorDbHost: string;
  vectorDbPort: number;
  vectorDbDatabase: string;
  vectorDbUser: string;
  vectorDbPassword: string;
}

export class EmbeddingService {
  private openai: OpenAI;
  private pgPool: Pool;

  constructor(config: EmbeddingConfig) {
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey,
    });

    this.pgPool = new Pool({
      host: config.vectorDbHost,
      port: config.vectorDbPort,
      database: config.vectorDbDatabase,
      user: config.vectorDbUser,
      password: config.vectorDbPassword,
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  }

  async storeEmbedding(
    connectionId: string,
    tableName: string,
    schemaText: string,
    embedding: number[],
  ): Promise<void> {
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
  ): Promise<Array<{ table_name: string; schema_text: string; similarity: number }>> {
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

  async initializeVectorExtension(): Promise<void> {
    await this.pgPool.query('CREATE EXTENSION IF NOT EXISTS vector;');
  }

  async createSchemaEmbeddingsTable(): Promise<void> {
    await this.pgPool.query(`
      CREATE TABLE IF NOT EXISTS schema_embeddings (
        id SERIAL PRIMARY KEY,
        connection_id VARCHAR(255) NOT NULL,
        table_name VARCHAR(255) NOT NULL,
        schema_text TEXT NOT NULL,
        embedding vector(1536),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(connection_id, table_name)
      );
    `);

    await this.pgPool.query(`
      CREATE INDEX IF NOT EXISTS schema_embeddings_vector_idx 
      ON schema_embeddings 
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `);
  }

  async close(): Promise<void> {
    await this.pgPool.end();
  }
}

