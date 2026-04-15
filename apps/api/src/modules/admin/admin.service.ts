import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { Pool } from 'pg';
import { ConnectionStringParser } from '../../common/utils/connection-string-parser';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface CreateConnectionDto {
  name: string;
  connectionString?: string;
  anonKey?: string;
  accessMode?: 'read' | 'write' | 'update' | 'full';
  // Legacy individual-field support
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  type?: 'postgresql' | 'mysql' | 'sqlite';
}

export interface UpdateConnectionDto {
  name?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  accessMode?: 'read' | 'write' | 'update' | 'full';
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface ConnectionDetails {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  type: 'postgresql' | 'mysql' | 'sqlite';
  requiresSsl?: boolean;
}

// ─── Response types ───────────────────────────────────────────────────────────

export interface ConnectionStatus {
  connected: boolean;
  status: 'connected' | 'error';
  message: string;
  lastChecked: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  timestamp: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_PORTS: Record<string, number> = {
  postgresql: 5432,
  mysql: 3306,
  sqlite: 0,
};

const SSL_REQUIRED_HOSTS = [
  'neon.tech',
  'supabase.co',
  'supabase.com',
  'aws.',
  'cloud.',
  'amazonaws.com',
  'pooler.',
] as const;

const POOL_CONNECTION_TIMEOUT_MS = 15000;
const POOL_IDLE_TIMEOUT_MS = 5000;
const POOL_MAX_CLIENTS = 1;

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Saves a new database connection after validating the connection string format.
   * Does NOT perform a live connection test — that is intentional so users can
   * save connections even when their local network blocks the database port.
   * Use testExistingConnection / testConnectionPreSave for live tests.
   */
  async createConnection(userId: string, dto: CreateConnectionDto) {
    if (!dto.name?.trim()) {
      throw new BadRequestException('Connection name is required');
    }

    // Parse + validate format — throws BadRequestException on bad format
    const connectionDetails = this.parseConnectionDetails(dto);

    try {
      const record = await this.prisma.databaseConnection.create({
        data: {
          userId,
          name: dto.name.trim(),
          connectionString: dto.connectionString?.trim() ?? null,
          anonKey: dto.anonKey?.trim() ?? null,
          host: connectionDetails.host,
          port: connectionDetails.port,
          database: connectionDetails.database,
          username: connectionDetails.username,
          password: connectionDetails.password,
          type: connectionDetails.type,
          accessMode: dto.accessMode ?? 'read',
        } as any,
      });

      this.logger.log(`Connection "${record.name}" (${record.id}) created for user ${userId}`);
      return record;
    } catch (error) {
      if (this.isPrismaUniqueViolation(error)) {
        throw new BadRequestException(
          `A connection named "${dto.name.trim()}" already exists`,
        );
      }
      if (this.isPrismaSchemaError(error)) {
        throw new BadRequestException(
          'Database schema not initialized. Please run: pnpm migrate',
        );
      }
      throw error;
    }
  }

  /**
   * Update metadata of an existing connection.
   * If connection credentials change, a live test is performed before saving.
   */
  async updateConnection(connectionId: string, userId: string, dto: UpdateConnectionDto) {
    const connection = await this.findConnectionById(connectionId, userId);

    if (this.hasConnectionCredentialsChanged(dto)) {
      const merged = this.mergeConnectionDetails(connection, dto);
      // Test only when credentials actually changed to avoid breaking existing working connections
      await this.testConnection(merged);
    }

    return this.prisma.databaseConnection.update({
      where: { id: connectionId },
      data: {
        name: dto.name,
        host: dto.host,
        port: dto.port,
        database: dto.database,
        username: dto.username,
        password: dto.password,
        accessMode: dto.accessMode,
      } as any,
    });
  }

  async deleteConnection(connectionId: string, userId: string): Promise<void> {
    await this.findConnectionById(connectionId, userId); // ownership check

    await this.prisma.databaseConnection.delete({
      where: { id: connectionId },
    });

    this.logger.log(`Connection ${connectionId} deleted by user ${userId}`);
  }

  async getConnections(userId: string) {
    const connections = await this.prisma.databaseConnection.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return connections.map((conn) => this.toSafeConnectionDto(conn));
  }

  async getConnection(connectionId: string, userId: string) {
    const connection = await this.findConnectionById(connectionId, userId);
    return this.toSafeConnectionDto(connection);
  }

  /**
   * Test an already-saved connection by ID.
   * Returns a result object instead of throwing so the frontend can display status gracefully.
   */
  async testExistingConnection(
    connectionId: string,
    userId: string,
  ): Promise<ConnectionTestResult> {
    const connection = await this.findConnectionById(connectionId, userId);
    const start = Date.now();

    try {
      await this.testConnection(this.mapToConnectionDetails(connection));
      return {
        success: true,
        message: 'Connection successful',
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: this.extractErrorMessage(error),
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Test a connection from raw DTO (pre-save test from the create form).
   * Returns a result object so the frontend can decide whether to proceed.
   */
  async testConnectionPreSave(dto: CreateConnectionDto): Promise<ConnectionTestResult> {
    const start = Date.now();

    try {
      const connectionDetails = this.parseConnectionDetails(dto);
      await this.testConnection(connectionDetails);
      return {
        success: true,
        message: 'Connection successful — ready to save',
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: this.extractErrorMessage(error),
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * @deprecated Use testExistingConnection instead.
   * Kept for backwards-compatibility with existing controller routes.
   */
  async testConnectionById(connectionId: string, userId: string): Promise<void> {
    const connection = await this.findConnectionById(connectionId, userId);
    await this.testConnection(this.mapToConnectionDetails(connection));
  }

  async getConnectionStatus(connectionId: string, userId: string): Promise<ConnectionStatus> {
    const result = await this.testExistingConnection(connectionId, userId);

    return {
      connected: result.success,
      status: result.success ? 'connected' : 'error',
      message: result.message,
      lastChecked: result.timestamp,
    };
  }

  // ── Private: parsing ────────────────────────────────────────────────────────

  private parseConnectionDetails(dto: CreateConnectionDto): ConnectionDetails {
    if (dto.connectionString?.trim()) {
      return this.parseConnectionString(dto.connectionString.trim());
    }
    return this.parseLegacyFields(dto);
  }

  private parseConnectionString(connectionString: string): ConnectionDetails {
    try {
      const parsed = ConnectionStringParser.parse(connectionString);

      return {
        host: parsed.host,
        port: parsed.port,
        database: parsed.database,
        username: parsed.username,
        password: parsed.password,
        // MongoDB is not yet supported as a backend query target — map to postgresql type
        type: parsed.type === 'mongodb' ? 'postgresql' : parsed.type,
        requiresSsl: parsed.ssl,
      };
    } catch (error) {
      const message = error instanceof BadRequestException
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Invalid connection string';
      throw new BadRequestException(`Invalid connection string: ${message}`);
    }
  }

  private parseLegacyFields(dto: CreateConnectionDto): ConnectionDetails {
    const missing: string[] = [];
    if (!dto.host) missing.push('host');
    if (!dto.database) missing.push('database');
    if (!dto.username) missing.push('username');
    if (!dto.password) missing.push('password');
    if (!dto.type) missing.push('type');

    if (missing.length > 0) {
      throw new BadRequestException(
        `Either connectionString or all individual fields are required. Missing: ${missing.join(', ')}`,
      );
    }

    const type = dto.type!;
    return {
      host: dto.host!,
      port: dto.port ?? DEFAULT_PORTS[type] ?? 5432,
      database: dto.database!,
      username: dto.username!,
      password: dto.password!,
      type,
    };
  }

  // ── Private: database operations ────────────────────────────────────────────

  private async findConnectionById(connectionId: string, userId: string) {
    const connection = await this.prisma.databaseConnection.findFirst({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      throw new NotFoundException(`Connection not found`);
    }

    return connection;
  }

  private toSafeConnectionDto(conn: any) {
    return {
      id: conn.id,
      name: conn.name,
      host: conn.host,
      port: conn.port,
      database: conn.database,
      username: conn.username,
      type: conn.type,
      accessMode: conn.accessMode ?? 'read',
      createdAt: conn.createdAt,
      updatedAt: conn.updatedAt,
    };
  }

  // ── Private: connection testing ─────────────────────────────────────────────

  /**
   * Performs a live connection test. Throws BadRequestException on failure.
   * Automatically retries with SSL if first attempt fails with an SSL-related error.
   */
  private async testConnection(details: ConnectionDetails): Promise<void> {
    if (details.type !== 'postgresql') {
      throw new BadRequestException(
        `Only PostgreSQL connections are currently supported. Received: ${details.type}`,
      );
    }

    const requiresSsl =
      details.requiresSsl !== undefined
        ? details.requiresSsl
        : this.determineSslRequirement(details.host);

    const pool = this.createPool(details, requiresSsl);

    try {
      await this.testPoolConnection(pool);
    } catch (error) {
      // Attempt SSL retry before giving up (only if SSL was not already enabled)
      if (this.isSslError(error) && !requiresSsl) {
        await this.safeClosePool(pool);
        return this.retryWithSsl(details);
      }
      throw this.buildConnectionError(error, details);
    } finally {
      // Always clean up — safeClosePool suppresses errors on already-closed pools
      await this.safeClosePool(pool);
    }
  }

  private async retryWithSsl(details: ConnectionDetails): Promise<void> {
    this.logger.log(`Retrying connection to ${details.host} with SSL enabled`);
    const pool = this.createPool(details, true);

    try {
      await this.testPoolConnection(pool);
    } catch (error) {
      throw this.buildConnectionError(error, details);
    } finally {
      await this.safeClosePool(pool);
    }
  }

  private createPool(details: ConnectionDetails, requiresSsl: boolean): Pool {
    return new Pool({
      host: details.host,
      port: details.port,
      database: details.database,
      user: details.username,
      password: details.password,
      ssl: requiresSsl
        ? { rejectUnauthorized: false, servername: details.host }
        : false,
      connectionTimeoutMillis: POOL_CONNECTION_TIMEOUT_MS,
      idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
      max: POOL_MAX_CLIENTS,
    });
  }

  private async testPoolConnection(pool: Pool): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
  }

  private async safeClosePool(pool: Pool): Promise<void> {
    try {
      await pool.end();
    } catch {
      // Suppress — pool may already be closed
    }
  }

  // ── Private: helpers ────────────────────────────────────────────────────────

  private determineSslRequirement(host: string): boolean {
    return SSL_REQUIRED_HOSTS.some((segment) => host.includes(segment));
  }

  private isSslError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const SSL_ERROR_KEYWORDS = [
      'connection is insecure',
      'sslmode',
      'SSL connection',
      'SSL SYSCALL',
      'server does not support SSL',
      'no pg_hba.conf entry',
    ];
    return SSL_ERROR_KEYWORDS.some((kw) => error.message.includes(kw));
  }

  private hasConnectionCredentialsChanged(dto: UpdateConnectionDto): boolean {
    return !!(dto.host || dto.port || dto.database || dto.username || dto.password);
  }

  private mergeConnectionDetails(
    connection: {
      host: string;
      port: number;
      database: string;
      username: string;
      password: string;
      type: string;
    },
    dto: UpdateConnectionDto,
  ): ConnectionDetails {
    return {
      host: dto.host ?? connection.host,
      port: dto.port ?? connection.port,
      database: dto.database ?? connection.database,
      username: dto.username ?? connection.username,
      password: dto.password ?? connection.password,
      type: connection.type as 'postgresql' | 'mysql' | 'sqlite',
    };
  }

  private mapToConnectionDetails(connection: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    type: string;
  }): ConnectionDetails {
    return {
      host: connection.host,
      port: connection.port,
      database: connection.database,
      username: connection.username,
      password: connection.password,
      type: connection.type as 'postgresql' | 'mysql' | 'sqlite',
    };
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof BadRequestException) {
      const response = error.getResponse();
      if (typeof response === 'string') return response;
      if (typeof response === 'object' && response !== null && 'message' in response) {
        return String((response as any).message);
      }
    }
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Unknown error occurred';
  }

  private buildConnectionError(error: unknown, details: ConnectionDetails): BadRequestException {
    const rawMessage = this.extractErrorMessage(error);
    const raw = this.serializeError(error);
    const combined = `${rawMessage} ${raw}`.toLowerCase();

    if (combined.includes('enotfound') || combined.includes('getaddrinfo')) {
      return new BadRequestException(
        `Cannot reach database host: "${details.host}". Please verify the hostname is correct.`,
      );
    }

    if (combined.includes('etimedout') || combined.includes('ehostunreach') || combined.includes('econnrefused')) {
      return new BadRequestException(
        `Connection timed out (${details.host}:${details.port}). ` +
          `Your network or firewall might be blocking port ${details.port}, or the database is unreachable.`,
      );
    }

    if (combined.includes('password authentication failed') || combined.includes('invalid password')) {
      return new BadRequestException(
        'Authentication failed. Please check your username and password.',
      );
    }

    if (combined.includes('does not exist') && combined.includes('database')) {
      return new BadRequestException(
        `Database "${details.database}" does not exist on host "${details.host}".`,
      );
    }

    if (combined.includes('role') && combined.includes('does not exist')) {
      return new BadRequestException(
        `User "${details.username}" does not exist on this database server.`,
      );
    }

    return new BadRequestException(`Connection test failed: ${rawMessage}`);
  }

  private serializeError(error: unknown): string {
    try {
      return typeof error === 'object'
        ? JSON.stringify(error, Object.getOwnPropertyNames(error))
        : String(error);
    } catch {
      return String(error);
    }
  }

  // ── Private: Prisma error detection ─────────────────────────────────────────

  private isPrismaSchemaError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    return (
      error.message?.includes('does not exist') ||
      (error as any).code === '42P01' ||
      (error as any).code === 'P2021'
    );
  }

  private isPrismaUniqueViolation(error: unknown): boolean {
    return (error as any)?.code === 'P2002';
  }
}
