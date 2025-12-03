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
  static parse(connectionString: string): ParsedConnectionString {
    if (!connectionString || !connectionString.trim()) {
      throw new BadRequestException('Connection string is required');
    }

    const trimmed = connectionString.trim();

    // Try PostgreSQL/Postgres format
    if (trimmed.startsWith('postgresql://') || trimmed.startsWith('postgres://')) {
      return this.parsePostgreSQL(trimmed);
    }

    // Try MySQL format
    if (trimmed.startsWith('mysql://') || trimmed.startsWith('mysql2://')) {
      return this.parseMySQL(trimmed);
    }

    // Try MongoDB format
    if (trimmed.startsWith('mongodb://') || trimmed.startsWith('mongodb+srv://')) {
      return this.parseMongoDB(trimmed);
    }

    throw new BadRequestException(
      'Unsupported connection string format. Supported formats: postgresql://, mysql://, mongodb://',
    );
  }

  private static parsePostgreSQL(connectionString: string): ParsedConnectionString {
    try {
      const url = new URL(connectionString);
      const host = url.hostname;
      const port = url.port ? parseInt(url.port, 10) : 5432;
      const database = url.pathname.slice(1) || url.searchParams.get('database') || '';
      const username = decodeURIComponent(url.username || '');
      const password = decodeURIComponent(url.password || '');
      const ssl = url.searchParams.get('sslmode') === 'require' || 
                  url.searchParams.get('ssl') === 'true' ||
                  url.searchParams.has('sslmode');

      // Detect Supabase (supabase.co domain)
      // Detect NeonDB (neon.tech domain or neon database)
      const isSupabase = host.includes('supabase.co');
      const isNeon = host.includes('neon.tech') || host.includes('neon');

      // Additional params
      const additionalParams: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        if (!['sslmode', 'ssl', 'database'].includes(key)) {
          additionalParams[key] = value;
        }
      });

      if (!host || !database || !username) {
        throw new BadRequestException('Invalid PostgreSQL connection string: missing required fields');
      }

      return {
        type: 'postgresql',
        host,
        port,
        database,
        username,
        password,
        ssl: ssl || isSupabase || isNeon, // Supabase and NeonDB require SSL
        additionalParams,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Invalid PostgreSQL connection string: ${error.message}`);
    }
  }

  private static parseMySQL(connectionString: string): ParsedConnectionString {
    try {
      const url = new URL(connectionString);
      const host = url.hostname;
      const port = url.port ? parseInt(url.port, 10) : 3306;
      const database = url.pathname.slice(1) || url.searchParams.get('database') || '';
      const username = decodeURIComponent(url.username || '');
      const password = decodeURIComponent(url.password || '');
      const ssl = url.searchParams.get('ssl') === 'true';

      const additionalParams: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        if (!['ssl', 'database'].includes(key)) {
          additionalParams[key] = value;
        }
      });

      if (!host || !database || !username) {
        throw new BadRequestException('Invalid MySQL connection string: missing required fields');
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
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Invalid MySQL connection string: ${error.message}`);
    }
  }

  private static parseMongoDB(connectionString: string): ParsedConnectionString {
    try {
      const url = new URL(connectionString);
      const host = url.hostname;
      const port = url.port ? parseInt(url.port, 10) : (connectionString.includes('mongodb+srv://') ? 27017 : 27017);
      const database = url.pathname.slice(1) || url.searchParams.get('database') || '';
      const username = decodeURIComponent(url.username || '');
      const password = decodeURIComponent(url.password || '');
      const ssl = connectionString.includes('mongodb+srv://') || url.searchParams.get('ssl') === 'true';

      const additionalParams: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        if (!['ssl', 'database'].includes(key)) {
          additionalParams[key] = value;
        }
      });

      if (!host || !database) {
        throw new BadRequestException('Invalid MongoDB connection string: missing required fields');
      }

      return {
        type: 'mongodb',
        host,
        port,
        database,
        username: username || '', // MongoDB can work without username/password
        password: password || '',
        ssl,
        additionalParams,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Invalid MongoDB connection string: ${error.message}`);
    }
  }

  /**
   * Detects the database type from connection string without parsing fully
   */
  static detectType(connectionString: string): 'postgresql' | 'mysql' | 'mongodb' | null {
    if (!connectionString || !connectionString.trim()) {
      return null;
    }

    const trimmed = connectionString.trim().toLowerCase();

    if (trimmed.startsWith('postgresql://') || trimmed.startsWith('postgres://')) {
      return 'postgresql';
    }
    if (trimmed.startsWith('mysql://') || trimmed.startsWith('mysql2://')) {
      return 'mysql';
    }
    if (trimmed.startsWith('mongodb://') || trimmed.startsWith('mongodb+srv://')) {
      return 'mongodb';
    }

    return null;
  }
}

