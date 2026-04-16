import { Injectable, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { PrismaService } from '../db/prisma.service';
import { LlmService } from '../llm/llm.service';
import { GuardrailsService } from '../llm/guardrails.service';
import { SchemaService, TableMetadata } from '../schema/schema.service';
import { SchemaVectorService } from '../schema/schema.vector.service';

export interface ExecuteQueryDto {
  connectionId: string;
  naturalLanguageQuery: string;
  userId: string;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTime: number;
  sql: string;
}

const SSL_REQUIRED_HOSTS = [
  'neon.tech',
  'supabase.co',
  'supabase.com',
  'aws.',
  'cloud.',
  'amazonaws.com',
  'pooler.',
  'insforge.app',
  '.database.',
] as const;

const DANGEROUS_KEYWORDS = [
  'INSERT',
  'UPDATE',
  'DELETE',
  'DROP',
  'CREATE',
  'ALTER',
  'TRUNCATE',
] as const;

const DEFAULT_ACCESS_MODE = 'read';

@Injectable()
export class QueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
    private readonly guardrailsService: GuardrailsService,
    private readonly schemaService: SchemaService,
    private readonly vectorService: SchemaVectorService,
  ) {}

  async executeQuery(
    dto: ExecuteQueryDto,
    userOpenRouterKey?: string | null,
  ): Promise<QueryResult> {
    const startTime = Date.now();
    const connection = await this.getConnection(dto.connectionId);
    const schemaMetadata = await this.schemaService.getDatabaseMetadata(dto.connectionId);
    const schemaContext = await this.generateSchemaContext(schemaMetadata);

    const sql = await this.llmService.generateSQL(
      dto.naturalLanguageQuery,
      schemaContext,
      undefined,
      userOpenRouterKey,
    );

    const validation = this.guardrailsService.validateSQL(sql);
    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    const sanitizedSQL = this.guardrailsService.sanitizeSQL(sql);
    this.validateReadOnlyAccess(connection, sanitizedSQL);

    return this.executeDatabaseQuery(connection, sanitizedSQL, startTime);
  }

  private async getConnection(connectionId: string) {
    const connection = await this.prisma.databaseConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new BadRequestException('Database connection not found');
    }

    return connection;
  }

  private validateReadOnlyAccess(
    connection: { host: string; port: number; database: string; username: string; password: string; type: string; connectionString?: string | null },
    sql: string,
  ): void {
    const accessMode = (connection as any).accessMode || DEFAULT_ACCESS_MODE;
    const isReadOnly = accessMode === 'read';
    
    if (!isReadOnly) {
      return;
    }

    const sqlUpper = sql.trim().toUpperCase();
    const dangerousKeyword = DANGEROUS_KEYWORDS.find((keyword) => sqlUpper.includes(keyword));

    if (dangerousKeyword) {
          throw new BadRequestException(
        `Operation ${dangerousKeyword} is not allowed in read-only mode. Change connection access mode to allow write operations.`,
          );
        }
      }

  private async executeDatabaseQuery(
    connection: { host: string; port: number; database: string; username: string; password: string; connectionString?: string | null },
    sql: string,
    startTime: number,
  ): Promise<QueryResult> {
    const requiresSsl = this.detectSsl(connection);
    const pool = this.createPool(connection, requiresSsl);

    try {
      const result = await pool.query(sql);
      const executionTime = Date.now() - startTime;

      return {
        columns: result.fields.map((field) => field.name),
        rows: result.rows,
        rowCount: result.rowCount || 0,
        executionTime,
        sql,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Query execution failed: ${message}`);
    } finally {
      await pool.end();
    }
  }

  private detectSsl(connection: { host: string; connectionString?: string | null }): boolean {
    if (connection.connectionString) {
      try {
        const url = new URL(connection.connectionString);
        const sslMode = url.searchParams.get('sslmode');
        if (sslMode === 'require' || sslMode === 'prefer' || sslMode === 'verify-full') return true;
        if (sslMode === 'disable') return false;
      } catch { /* fall through */ }
    }
    return SSL_REQUIRED_HOSTS.some((h) => connection.host.includes(h));
  }

  private createPool(
    connection: { host: string; port: number; database: string; username: string; password: string },
    requiresSsl: boolean,
  ): Pool {
    return new Pool({
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.username,
      password: connection.password,
      ssl: requiresSsl ? { rejectUnauthorized: false } : false,
    });
  }

  private async generateSchemaContext(metadata: TableMetadata[]): Promise<string> {
    const contextParts = await Promise.all(
      metadata.map((table) => this.vectorService.generateSchemaText(table)),
    );
    return contextParts.join('\n\n');
  }
}
