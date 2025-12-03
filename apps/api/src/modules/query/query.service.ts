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

  async executeQuery(dto: ExecuteQueryDto): Promise<QueryResult> {
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

    // Generate SQL from natural language
    const sql = await this.llmService.generateSQL(
      dto.naturalLanguageQuery,
      schemaContext,
    );

    // Validate SQL with guardrails
    const validation = this.guardrailsService.validateSQL(sql);
    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    // Sanitize SQL
    const sanitizedSQL = this.guardrailsService.sanitizeSQL(sql);

    // Execute query
    const pool = new Pool({
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.username,
      password: connection.password,
    });

    try {
      const result = await pool.query(sanitizedSQL);
      const executionTime = Date.now() - startTime;

      return {
        columns: result.fields.map((field) => field.name),
        rows: result.rows,
        rowCount: result.rowCount,
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

