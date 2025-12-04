import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { Pool } from 'pg';
import { ConnectionStringParser } from '../../common/utils/connection-string-parser';

export interface CreateConnectionDto {
  name: string;
  connectionString?: string; // Connection string/URL (PostgreSQL, MySQL, NeonDB, etc.)
  accessMode?: 'read' | 'write' | 'update' | 'full'; // Access mode for the connection
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
  accessMode?: 'read' | 'write' | 'update' | 'full';
}

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async createConnection(userId: string, dto: CreateConnectionDto) {
    // Parse and validate connection details
    let connectionDetails: {
      host: string;
      port: number;
      database: string;
      username: string;
      password: string;
      type: 'postgresql' | 'mysql' | 'sqlite';
      requiresSsl?: boolean;
    };

    if (dto.connectionString) {
      // Parse connection string (supports PostgreSQL, NeonDB, MySQL, etc.)
      try {
        const parsed = ConnectionStringParser.parse(dto.connectionString);
        connectionDetails = {
          host: parsed.host,
          port: parsed.port,
          database: parsed.database,
          username: parsed.username,
          password: parsed.password,
          type: parsed.type === 'mongodb' ? 'postgresql' : parsed.type,
          requiresSsl: parsed.ssl, // Pass SSL flag from parsed connection string
        };
      } catch (error: any) {
        throw new BadRequestException(`Invalid connection string: ${error.message}`);
      }
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
        requiresSsl: undefined, // Will be determined by hostname in testConnection
      };
    }

    // Test connection before saving
    console.log('🔵 Testing database connection...');
    console.log(`   Host: ${connectionDetails.host}`);
    console.log(`   Database: ${connectionDetails.database}`);
    console.log(`   SSL Required: ${connectionDetails.requiresSsl}`);
    await this.testConnection(connectionDetails);

    // Store connection details
    try {
    return await this.prisma.databaseConnection.create({
      data: {
        userId,
          name: dto.name.trim(),
          connectionString: dto.connectionString?.trim() || null,
          anonKey: null, // Not used for regular connections
        host: connectionDetails.host,
        port: connectionDetails.port,
        database: connectionDetails.database,
        username: connectionDetails.username,
          password: connectionDetails.password,
        type: connectionDetails.type,
          accessMode: dto.accessMode || 'read',
      },
    });
    } catch (error: any) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        throw new BadRequestException(
          'Database schema not initialized. Please run migrations: pnpm migrate'
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
    const connection = await this.prisma.databaseConnection.findFirst({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      throw new BadRequestException('Connection not found');
    }

    // If connection details are being updated, test them first
    if (dto.host || dto.port || dto.database || dto.username || dto.password) {
      const newDetails = {
        host: dto.host || connection.host,
        port: dto.port || connection.port,
        database: dto.database || connection.database,
        username: dto.username || connection.username,
        password: dto.password || connection.password,
        type: connection.type as 'postgresql' | 'mysql' | 'sqlite',
      };
      await this.testConnection(newDetails);
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
      },
    });
  }

  async deleteConnection(connectionId: string, userId: string) {
    // Verify connection exists and belongs to user
    const connection = await this.prisma.databaseConnection.findFirst({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      throw new BadRequestException('Connection not found or you do not have permission to delete it');
    }

    // Delete connection (Prisma will cascade delete related QueryHistory records)
    // due to onDelete: Cascade in schema
    await this.prisma.databaseConnection.delete({
      where: { id: connectionId },
    });

    return { success: true, message: 'Connection deleted successfully' };
  }

  async getConnections(userId: string) {
    return this.prisma.databaseConnection.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        database: true,
        username: true,
        type: true,
        accessMode: true,
        createdAt: true,
        updatedAt: true,
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
        username: true,
        type: true,
        accessMode: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!connection) {
      throw new BadRequestException('Connection not found');
    }

    return connection;
  }

  async testConnectionById(connectionId: string, userId: string) {
    const connection = await this.prisma.databaseConnection.findFirst({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      throw new BadRequestException('Connection not found');
    }

    await this.testConnection({
      host: connection.host,
      port: connection.port,
      database: connection.database,
      username: connection.username,
      password: connection.password,
      type: connection.type as 'postgresql' | 'mysql' | 'sqlite',
    });

    return { success: true, message: 'Connection test successful' };
  }

  async getConnectionStatus(connectionId: string, userId: string) {
    const connection = await this.prisma.databaseConnection.findFirst({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      throw new BadRequestException('Connection not found');
    }

    // Determine if SSL is required based on host (same logic as testConnection)
    const requiresSsl = connection.host.includes('neon.tech') || 
                        connection.host.includes('supabase.co') ||
                        connection.host.includes('aws.') ||
                        connection.host.includes('cloud.') ||
                        connection.host.includes('amazonaws.com') ||
                        connection.host.includes('pooler.');

    try {
      await this.testConnection({
        host: connection.host,
        port: connection.port,
        database: connection.database,
        username: connection.username,
        password: connection.password,
        type: connection.type as 'postgresql' | 'mysql' | 'sqlite',
        requiresSsl, // Pass SSL requirement
      });

      // Return format expected by frontend
      return {
        connected: true,
        status: 'connected' as const,
        message: 'Connection successful',
        lastChecked: new Date().toISOString(),
      };
    } catch (error: any) {
      // Return format expected by frontend
      return {
        connected: false,
        status: 'error' as const,
        message: error.message || 'Connection failed',
        lastChecked: new Date().toISOString(),
      };
    }
  }

  async testConnectionDto(dto: CreateConnectionDto) {
    let connectionDetails: {
      host: string;
      port: number;
      database: string;
      username: string;
      password: string;
      type: 'postgresql' | 'mysql' | 'sqlite';
      requiresSsl?: boolean;
    };

    if (dto.connectionString) {
      try {
        const parsed = ConnectionStringParser.parse(dto.connectionString);
        connectionDetails = {
          host: parsed.host,
          port: parsed.port,
          database: parsed.database,
          username: parsed.username,
          password: parsed.password,
          type: parsed.type === 'mongodb' ? 'postgresql' : parsed.type,
          requiresSsl: parsed.ssl, // Use SSL flag from parsed connection string
        };
      } catch (error: any) {
        throw new BadRequestException(`Invalid connection string: ${error.message}`);
      }
    } else if (dto.host && dto.database && dto.username && dto.password && dto.type) {
      connectionDetails = {
        host: dto.host,
        port: dto.port || (dto.type === 'postgresql' ? 5432 : dto.type === 'mysql' ? 3306 : 0),
        database: dto.database,
        username: dto.username,
        password: dto.password,
        type: dto.type,
        requiresSsl: undefined, // Will be determined by hostname in testConnection
      };
    } else {
      throw new BadRequestException(
        'Either connectionString or all individual fields (host, database, username, password, type) are required'
      );
    }

    await this.testConnection(connectionDetails);
  }

  private async testConnection(details: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    type: 'postgresql' | 'mysql' | 'sqlite';
    requiresSsl?: boolean;
  }) {
    if (details.type !== 'postgresql') {
      throw new BadRequestException('Only PostgreSQL connections are currently supported');
    }

    // Determine if SSL is required:
    // 1. Use explicit SSL flag from connection string if provided
    // 2. Otherwise, determine based on hostname
    const requiresSsl = details.requiresSsl !== undefined 
      ? details.requiresSsl
      : details.host.includes('neon.tech') || 
        details.host.includes('supabase.co') ||
        details.host.includes('aws.') ||
        details.host.includes('cloud.') ||
        details.host.includes('amazonaws.com') ||
        details.host.includes('pooler.'); // NeonDB pooler endpoints

    console.log(`🔍 Connection test - SSL required: ${requiresSsl}, Host: ${details.host}`);

    // Always use SSL for NeonDB and cloud databases, or if explicitly required
    const pool = new Pool({
      host: details.host,
      port: details.port,
      database: details.database,
      user: details.username,
      password: details.password,
      ssl: requiresSsl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000, // 10 second timeout
    });

    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('✅ Database connection test successful');
    } catch (error: any) {
      console.error('❌ Database connection test failed:', error.message);
      await pool.end(); // Close the pool before retrying
      
      // If we got an insecure connection error, retry with SSL (even if we thought SSL was enabled)
      if (error.message.includes('connection is insecure') || 
          error.message.includes('sslmode') ||
          error.message.includes('SSL connection') ||
          error.message.includes('server does not support SSL')) {
        // Only retry if we didn't already use SSL
        if (!requiresSsl) {
          console.log('🔄 Retrying with SSL enabled...');
          const sslPool = new Pool({
            host: details.host,
            port: details.port,
            database: details.database,
            user: details.username,
            password: details.password,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 10000,
          });
          
          try {
            const client = await sslPool.connect();
            await client.query('SELECT 1');
            client.release();
            await sslPool.end();
            console.log('✅ Database connection test successful (with SSL)');
            return; // Success with SSL
          } catch (sslError: any) {
            await sslPool.end();
            throw new BadRequestException(`Connection test failed: ${sslError.message}`);
          }
        } else {
          // SSL was already enabled but still failed - might be SSL configuration issue
          throw new BadRequestException(
            `Connection test failed with SSL enabled: ${error.message}. ` +
            `Please verify your connection string and SSL settings.`
          );
        }
      }
      
      // Provide helpful error messages
      if (error.message.includes('ENOTFOUND')) {
        throw new BadRequestException(
          `Cannot reach database host: ${details.host}. Please check the hostname.`
        );
      } else if (error.message.includes('password authentication failed')) {
        throw new BadRequestException(
          'Authentication failed. Please check your username and password.'
        );
      } else if (error.message.includes('does not exist')) {
        throw new BadRequestException(
          `Database "${details.database}" does not exist. Please check the database name.`
        );
      } else {
        throw new BadRequestException(`Connection test failed: ${error.message}`);
      }
    } finally {
      // Pool is already closed in catch block if error occurred
      try {
        await pool.end();
      } catch {
        // Ignore errors when closing pool
      }
    }
  }
}
