import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { Pool } from 'pg';
import { ConnectionStringParser, ParsedConnectionString } from '../../common/utils/connection-string-parser';

export interface CreateConnectionDto {
  name: string;
  connectionString?: string; // Connection string/URL
  anonKey?: string; // Anon key (for Supabase and similar services)
  // Legacy fields (for backward compatibility)
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
}

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async createConnection(userId: string, dto: CreateConnectionDto) {
    let connectionDetails: {
      host: string;
      port: number;
      database: string;
      username: string;
      password: string;
      type: 'postgresql' | 'mysql' | 'sqlite';
    };

    // Parse connection string if provided
    if (dto.connectionString) {
      const parsed = ConnectionStringParser.parse(dto.connectionString);
      connectionDetails = {
        host: parsed.host,
        port: parsed.port,
        database: parsed.database,
        username: parsed.username,
        password: parsed.password,
        type: parsed.type === 'mongodb' ? 'postgresql' : parsed.type, // MongoDB not fully supported yet, treat as postgresql for now
      };
    } else {
      // Use legacy fields
      if (!dto.host || !dto.database || !dto.username || !dto.password || !dto.type) {
        throw new BadRequestException(
          'Either connectionString or all individual fields (host, port, database, username, password, type) are required',
        );
      }
      connectionDetails = {
        host: dto.host,
        port: dto.port || (dto.type === 'postgresql' ? 5432 : dto.type === 'mysql' ? 3306 : 0),
        database: dto.database,
        username: dto.username,
        password: dto.password,
        type: dto.type,
      };
    }

    // Test connection before saving
    await this.testConnection(connectionDetails);

    // Store connection details including the original connection string and anon key if provided
    return await this.prisma.databaseConnection.create({
      data: {
        userId,
        name: dto.name.trim(), // Ensure name is stored
        connectionString: dto.connectionString?.trim() || null, // Store original connection string/URL
        anonKey: dto.anonKey?.trim() || null, // Store anon key (for Supabase and similar)
        host: connectionDetails.host,
        port: connectionDetails.port,
        database: connectionDetails.database,
        username: connectionDetails.username,
        password: connectionDetails.password, // In production, encrypt this
        type: connectionDetails.type,
      },
    });
  }

  async updateConnection(
    connectionId: string,
    userId: string,
    dto: UpdateConnectionDto,
  ) {
    // Verify ownership
    const connection = await this.prisma.databaseConnection.findFirst({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      throw new BadRequestException('Connection not found');
    }

    // If connection details changed, test the connection
    if (dto.host || dto.port || dto.database || dto.username || dto.password) {
      await this.testConnection({
        ...connection,
        ...dto,
        type: connection.type as any,
      });
    }

    return await this.prisma.databaseConnection.update({
      where: { id: connectionId },
      data: dto,
    });
  }

  async deleteConnection(connectionId: string, userId: string) {
    const connection = await this.prisma.databaseConnection.findFirst({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      throw new BadRequestException('Connection not found');
    }

    return await this.prisma.databaseConnection.delete({
      where: { id: connectionId },
    });
  }

  async getConnections(userId: string) {
    return await this.prisma.databaseConnection.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        database: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        // Don't return password
      },
    });
  }

  async getConnection(connectionId: string, userId: string) {
    const connection = await this.prisma.databaseConnection.findFirst({
      where: { id: connectionId, userId },
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        database: true,
        type: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!connection) {
      throw new BadRequestException('Connection not found');
    }

    return connection;
  }

  async testConnection(
    dto: CreateConnectionDto | (UpdateConnectionDto & { type: string }) | ParsedConnectionString,
  ) {
    try {
      // Handle ParsedConnectionString
      if ('type' in dto && 'host' in dto && 'database' in dto) {
        if (dto.type === 'postgresql') {
          const pool = new Pool({
            host: dto.host,
            port: dto.port,
            database: dto.database,
            user: dto.username,
            password: dto.password,
            ssl: dto.ssl,
            connectionTimeoutMillis: 5000,
          });

          await pool.query('SELECT 1');
          await pool.end();
        } else if (dto.type === 'mysql') {
          // MySQL connection testing would go here
          // For now, we'll throw an error as MySQL support needs to be added
          throw new BadRequestException('MySQL connection testing not yet implemented');
        } else {
          throw new BadRequestException('Unsupported database type for testing');
        }
      } else {
        // Legacy format
        const legacyDto = dto as CreateConnectionDto | (UpdateConnectionDto & { type: string });
        if (!legacyDto.host || !legacyDto.database || !legacyDto.username || !legacyDto.password) {
          throw new BadRequestException('Missing required connection fields');
        }

        if (legacyDto.type === 'postgresql') {
          const pool = new Pool({
            host: legacyDto.host,
            port: legacyDto.port || 5432,
            database: legacyDto.database,
            user: legacyDto.username,
            password: legacyDto.password,
            connectionTimeoutMillis: 5000,
          });

          await pool.query('SELECT 1');
          await pool.end();
        } else {
          throw new BadRequestException('Only PostgreSQL connections are currently supported for testing');
        }
      }
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Connection test failed: ${error.message}`);
    }
  }
}

