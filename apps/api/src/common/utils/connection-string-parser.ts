import { BadRequestException } from '@nestjs/common';

export interface ParsedConnectionString {
  type: 'postgresql' | 'mysql' | 'mongodb';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  additionalParams?: Record<string, string>;
}

/**
 * Parses various database connection string formats
 * Supports:
 * - PostgreSQL: postgresql://, postgres://
 * - MySQL: mysql://, mysql2://
 * - MongoDB: mongodb://, mongodb+srv://
 * - Supabase: postgresql:// (with special handling)
 * - NeonDB: postgresql:// (with special handling)
 */
export class ConnectionStringParser {
  private static readonly POSTGRESQL_PREFIXES = ['postgresql://', 'postgres://'];
  private static readonly MYSQL_PREFIXES = ['mysql://', 'mysql2://'];
  private static readonly MONGODB_PREFIXES = ['mongodb://', 'mongodb+srv://'];
  private static readonly DEFAULT_PORTS = {
    postgresql: 5432,
    mysql: 3306,
    mongodb: 27017,
  };

  static parse(connectionString: string): ParsedConnectionString {
    if (!connectionString?.trim()) {
      throw new BadRequestException('Connection string is required');
    }

    const trimmed = connectionString.trim();

    if (this.POSTGRESQL_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
      return this.parsePostgreSQL(trimmed);
    }

    if (this.MYSQL_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
      return this.parseMySQL(trimmed);
    }

    if (this.MONGODB_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
      return this.parseMongoDB(trimmed);
    }

    throw new BadRequestException('Unsupported connection string format');
  }

  private static parsePostgreSQL(connectionString: string): ParsedConnectionString {
    try {
      const url = new URL(connectionString);
      const host = url.hostname;
      const port = url.port ? parseInt(url.port, 10) : this.DEFAULT_PORTS.postgresql;
      const database = url.pathname.slice(1) || url.searchParams.get('database') || '';
      const username = decodeURIComponent(url.username || '');
      const password = decodeURIComponent(url.password || '');

      const sslMode = url.searchParams.get('sslmode');
      const sslParam = url.searchParams.get('ssl');
      const requiresSSL =
        sslMode === 'require' ||
        sslMode === 'prefer' ||
        sslParam === 'true' ||
        host.includes('supabase.co') ||
        host.includes('neon.tech') ||
        host.includes('neon');

      const additionalParams = this.extractAdditionalParams(url.searchParams, [
        'sslmode',
        'ssl',
        'database',
      ]);

      if (!host || !database || !username) {
        throw new BadRequestException('Invalid PostgreSQL connection string');
      }

      return {
        type: 'postgresql',
        host,
        port,
        database,
        username,
        password,
        ssl: requiresSSL,
        additionalParams,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid PostgreSQL connection string');
    }
  }

  private static parseMySQL(connectionString: string): ParsedConnectionString {
    try {
      const url = new URL(connectionString);
      const host = url.hostname;
      const port = url.port ? parseInt(url.port, 10) : this.DEFAULT_PORTS.mysql;
      const database = url.pathname.slice(1) || url.searchParams.get('database') || '';
      const username = decodeURIComponent(url.username || '');
      const password = decodeURIComponent(url.password || '');
      const ssl = url.searchParams.get('ssl') === 'true';

      const additionalParams = this.extractAdditionalParams(url.searchParams, ['ssl', 'database']);

      if (!host || !database || !username) {
        throw new BadRequestException('Invalid MySQL connection string');
      }

      return {
        type: 'mysql',
        host,
        port,
        database,
        username,
        password,
        ssl,
        additionalParams,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid MySQL connection string');
    }
  }

  private static parseMongoDB(connectionString: string): ParsedConnectionString {
    try {
      const url = new URL(connectionString);
      const host = url.hostname;
      const port = url.port ? parseInt(url.port, 10) : this.DEFAULT_PORTS.mongodb;
      const database = url.pathname.slice(1) || url.searchParams.get('database') || '';
      const username = decodeURIComponent(url.username || '');
      const password = decodeURIComponent(url.password || '');
      const ssl =
        connectionString.includes('mongodb+srv://') || url.searchParams.get('ssl') === 'true';

      const additionalParams = this.extractAdditionalParams(url.searchParams, ['ssl', 'database']);

      if (!host || !database) {
        throw new BadRequestException('Invalid MongoDB connection string');
      }

      return {
        type: 'mongodb',
        host,
        port,
        database,
        username: username || '',
        password: password || '',
        ssl,
        additionalParams,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid MongoDB connection string');
    }
  }

  private static extractAdditionalParams(
    searchParams: URLSearchParams,
    excludeKeys: string[],
  ): Record<string, string> {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (!excludeKeys.includes(key)) {
        params[key] = value;
      }
    });
    return params;
  }

  static detectType(connectionString: string): 'postgresql' | 'mysql' | 'mongodb' | null {
    if (!connectionString?.trim()) {
      return null;
    }

    const trimmed = connectionString.trim().toLowerCase();

    if (this.POSTGRESQL_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
      return 'postgresql';
    }
    if (this.MYSQL_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
      return 'mysql';
    }
    if (this.MONGODB_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
      return 'mongodb';
    }

    return null;
  }
}
