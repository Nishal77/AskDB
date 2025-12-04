import { Injectable, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { PrismaService } from '../db/prisma.service';
import { LlmService } from '../llm/llm.service';
import { GuardrailsService } from '../llm/guardrails.service';
import { SchemaService } from '../schema/schema.service';
import { SchemaVectorService } from '../schema/schema.vector.service';

export interface ExecuteQueryDto {
  connectionId: string;
  naturalLanguageQuery: string;
  userId: string;
}

export interface QueryResult {
  columns: string[];
  rows: any[];
  rowCount: number;
  executionTime: number;
  sql: string;
}

@Injectable()
export class QueryService {
  constructor(
    private prisma: PrismaService,
    private llmService: LlmService,
    private guardrailsService: GuardrailsService,
    private schemaService: SchemaService,
    private vectorService: SchemaVectorService,
  ) {}

  async executeQuery(dto: ExecuteQueryDto, userOpenRouterKey?: string | null): Promise<QueryResult> {
    const startTime = Date.now();

    // Get database connection
    const connection = await this.prisma.databaseConnection.findUnique({
      where: { id: dto.connectionId },
    });

    if (!connection) {
      throw new BadRequestException('Database connection not found');
    }

    // Get schema metadata
    const schemaMetadata = await this.schemaService.getDatabaseMetadata(dto.connectionId);
    
    // Generate schema context for LLM
    const schemaContext = await this.generateSchemaContext(schemaMetadata);

    // Generate SQL from natural language (use user's OpenRouter key if available)
    const sql = await this.llmService.generateSQL(
      dto.naturalLanguageQuery,
      schemaContext,
      undefined, // examples
      userOpenRouterKey, // user's OpenRouter key
    );

    // Validate SQL with guardrails
    const validation = this.guardrailsService.validateSQL(sql);
    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    // Sanitize SQL
    const sanitizedSQL = this.guardrailsService.sanitizeSQL(sql);

    // Check access mode - enforce read-only if set
    const accessMode = (connection as any).accessMode || 'read';
    const isReadOnly = accessMode === 'read';
    
    // Validate SQL for read-only mode
    if (isReadOnly) {
      const sqlUpper = sanitizedSQL.trim().toUpperCase();
      const dangerousKeywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE'];
      for (const keyword of dangerousKeywords) {
        if (sqlUpper.includes(keyword)) {
          throw new BadRequestException(
            `Operation ${keyword} is not allowed in read-only mode. Please change connection access mode to allow write operations.`
          );
        }
      }
    }

    // Determine if SSL is required based on host
    const requiresSsl = connection.host.includes('neon.tech') || 
                        connection.host.includes('supabase.co') ||
                        connection.host.includes('aws.') ||
                        connection.host.includes('cloud.') ||
                        connection.host.includes('amazonaws.com') ||
                        connection.host.includes('pooler.'); // NeonDB pooler endpoints

    // Execute query for PostgreSQL databases (NeonDB, Supabase, etc.)
    const pool = new Pool({
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.username,
      password: connection.password,
      ssl: requiresSsl ? { rejectUnauthorized: false } : false,
    });

    try {
      const result = await pool.query(sanitizedSQL);
      const executionTime = Date.now() - startTime;

      return {
        columns: result.fields.map((field) => field.name),
        rows: result.rows,
        rowCount: result.rowCount || 0,
        executionTime,
        sql: sanitizedSQL,
      };
    } catch (error: any) {
      throw new BadRequestException(`Query execution failed: ${error.message}`);
    } finally {
      await pool.end();
    }
  }

  private async generateSchemaContext(metadata: any[]): Promise<string> {
    const contextParts: string[] = [];

    for (const table of metadata) {
      const schemaText = await this.vectorService.generateSchemaText(table);
      contextParts.push(schemaText);
    }

    return contextParts.join('\n\n');
  }
}
