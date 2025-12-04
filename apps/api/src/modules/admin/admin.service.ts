import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { Pool } from 'pg';
import { ConnectionStringParser } from '../../common/utils/connection-string-parser';

export interface CreateConnectionDto {
  name: string;
  connectionString?: string;
  accessMode?: 'read' | 'write' | 'update' | 'full';
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

interface ConnectionDetails {
      host: string;
      port: number;
      database: string;
      username: string;
      password: string;
      type: 'postgresql' | 'mysql' | 'sqlite';
      requiresSsl?: boolean;
}

export interface ConnectionStatus {
  connected: boolean;
  status: 'connected' | 'error';
  message: string;
  lastChecked: string;
}

const DEFAULT_PORTS = {
  postgresql: 5432,
  mysql: 3306,
  sqlite: 0,
} as const;

const SSL_REQUIRED_HOSTS = [
  'neon.tech',
  'supabase.co',
  'aws.',
  'cloud.',
  'amazonaws.com',
  'pooler.',
] as const;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async createConnection(userId: string, dto: CreateConnectionDto) {
    const connectionDetails = this.parseConnectionDetails(dto);
    await this.testConnection(connectionDetails);

    try {
      const data: any = {
        userId,
          name: dto.name.trim(),
          connectionString: dto.connectionString?.trim() || null,
        anonKey: null,
        host: connectionDetails.host,
        port: connectionDetails.port,
        database: connectionDetails.database,
        username: connectionDetails.username,
          password: connectionDetails.password,
        type: connectionDetails.type,
          accessMode: dto.accessMode || 'read',
      };
      return await this.prisma.databaseConnection.create({ data });
    } catch (error) {
      if (this.isPrismaSchemaError(error)) {
        throw new BadRequestException(
          'Database schema not initialized. Please run migrations: pnpm migrate',
        );
      }
      throw error;
    }
  }

  async updateConnection(
    connectionId: string,
    userId: string,
    dto: UpdateConnectionDto,
  ) {
    const connection = await this.findConnectionById(connectionId, userId);

    if (this.hasConnectionDetailsChanged(dto)) {
      const newDetails = this.mergeConnectionDetails(connection, dto);
      await this.testConnection(newDetails);
    }

    const updateData: any = {
        name: dto.name,
        host: dto.host,
        port: dto.port,
        database: dto.database,
        username: dto.username,
        password: dto.password,
        accessMode: dto.accessMode,
    };
    return this.prisma.databaseConnection.update({
      where: { id: connectionId },
      data: updateData,
    });
  }

  async deleteConnection(connectionId: string, userId: string) {
    const connection = await this.findConnectionById(connectionId, userId);
    if (!connection) {
      throw new BadRequestException(
        'Connection not found or you do not have permission to delete it',
      );
    }

    await this.prisma.databaseConnection.delete({
      where: { id: connectionId },
    });
  }

  async getConnections(userId: string) {
    const connections = await this.prisma.databaseConnection.findMany({
      where: { userId },
    });
    return connections.map((conn) => ({
      id: conn.id,
      name: conn.name,
      host: conn.host,
      port: conn.port,
      database: conn.database,
      username: conn.username,
      type: conn.type,
      accessMode: (conn as any).accessMode,
      createdAt: conn.createdAt,
      updatedAt: conn.updatedAt,
    }));
  }

  async getConnection(connectionId: string, userId: string) {
    const connection = await this.prisma.databaseConnection.findFirst({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      throw new BadRequestException('Connection not found');
    }

    return {
      id: connection.id,
      name: connection.name,
      host: connection.host,
      port: connection.port,
      database: connection.database,
      username: connection.username,
      type: connection.type,
      accessMode: (connection as any).accessMode,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  }

  async testConnectionById(connectionId: string, userId: string) {
    const connection = await this.findConnectionById(connectionId, userId);
    await this.testConnection(this.mapToConnectionDetails(connection));
    }

  async getConnectionStatus(
    connectionId: string,
    userId: string,
  ): Promise<ConnectionStatus> {
    const connection = await this.findConnectionById(connectionId, userId);
    const requiresSsl = this.determineSslRequirement(connection.host);

    try {
      await this.testConnection({
        ...this.mapToConnectionDetails(connection),
        requiresSsl,
      });

      return {
        connected: true,
        status: 'connected',
        message: 'Connection successful',
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Connection failed';
      return {
        connected: false,
        status: 'error',
        message,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  async testConnectionDto(dto: CreateConnectionDto) {
    const connectionDetails = this.parseConnectionDetails(dto);
    await this.testConnection(connectionDetails);
  }

  private parseConnectionDetails(dto: CreateConnectionDto): ConnectionDetails {
    if (dto.connectionString) {
      return this.parseConnectionString(dto.connectionString);
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
          type: parsed.type === 'mongodb' ? 'postgresql' : parsed.type,
        requiresSsl: parsed.ssl,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid connection string';
      throw new BadRequestException(`Invalid connection string: ${message}`);
      }
  }

  private parseLegacyFields(dto: CreateConnectionDto): ConnectionDetails {
    if (!dto.host || !dto.database || !dto.username || !dto.password || !dto.type) {
      throw new BadRequestException(
        'Either connectionString or all individual fields (host, database, username, password, type) are required',
      );
    }

    return {
        host: dto.host,
      port: dto.port || DEFAULT_PORTS[dto.type],
        database: dto.database,
        username: dto.username,
        password: dto.password,
        type: dto.type,
    };
  }

  private async findConnectionById(connectionId: string, userId: string) {
    const connection = await this.prisma.databaseConnection.findFirst({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      throw new BadRequestException('Connection not found');
    }

    return connection;
  }

  private hasConnectionDetailsChanged(dto: UpdateConnectionDto): boolean {
    return !!(
      dto.host ||
      dto.port ||
      dto.database ||
      dto.username ||
      dto.password
    );
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
      host: dto.host || connection.host,
      port: dto.port || connection.port,
      database: dto.database || connection.database,
      username: dto.username || connection.username,
      password: dto.password || connection.password,
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

  private determineSslRequirement(host: string): boolean {
    return SSL_REQUIRED_HOSTS.some((requiredHost) => host.includes(requiredHost));
  }

  private async testConnection(details: ConnectionDetails): Promise<void> {
    if (details.type !== 'postgresql') {
      throw new BadRequestException(
        'Only PostgreSQL connections are currently supported',
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
      await pool.end();

      if (this.isSslError(error) && !requiresSsl) {
        return this.retryWithSsl(details);
      }

      throw this.createConnectionError(error, details);
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
      ssl: requiresSsl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000,
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

  private async retryWithSsl(details: ConnectionDetails): Promise<void> {
    const sslPool = this.createPool(details, true);
          
          try {
      await this.testPoolConnection(sslPool);
    } catch (error) {
            await sslPool.end();
      const message =
        error instanceof Error ? error.message : 'Connection test failed';
      throw new BadRequestException(`Connection test failed: ${message}`);
    } finally {
      await this.safeClosePool(sslPool);
    }
  }

  private isSslError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const sslErrorMessages = [
      'connection is insecure',
      'sslmode',
      'SSL connection',
      'server does not support SSL',
    ];

    return sslErrorMessages.some((msg) => error.message.includes(msg));
  }

  private createConnectionError(
    error: unknown,
    details: ConnectionDetails,
  ): BadRequestException {
    if (!(error instanceof Error)) {
      return new BadRequestException('Connection test failed');
        }

    const message = error.message;

    if (message.includes('ENOTFOUND')) {
      return new BadRequestException(
        `Cannot reach database host: ${details.host}. Please check the hostname.`,
        );
    }

    if (message.includes('password authentication failed')) {
      return new BadRequestException(
        'Authentication failed. Please check your username and password.',
        );
    }

    if (message.includes('does not exist')) {
      return new BadRequestException(
        `Database "${details.database}" does not exist. Please check the database name.`,
        );
    }

    return new BadRequestException(`Connection test failed: ${message}`);
      }

  private async safeClosePool(pool: Pool): Promise<void> {
      try {
        await pool.end();
      } catch {
        // Ignore errors when closing pool
      }
    }

  private isPrismaSchemaError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    return (
      error.message?.includes('does not exist') ||
      (error as any).code === '42P01'
    );
  }
}
