import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Successfully connected to database');
      
      // Validate that the database schema exists by checking if User table exists
      await this.validateDatabaseSchema();
    } catch (error: any) {
      this.logger.error('❌ Failed to connect to database', error);
      
      // Provide helpful error message
      if (error.message?.includes('does not exist')) {
        this.logger.error(
          '⚠️  Database tables do not exist. Please run migrations:\n' +
          '  pnpm migrate\n' +
          '  or\n' +
          '  cd packages/prisma && pnpm prisma migrate deploy'
        );
      } else if (error.message?.includes('P1001') || error.message?.includes('connect')) {
        this.logger.error(
          '⚠️  Cannot connect to database. Please check:\n' +
          '  1. DATABASE_URL is set correctly in .env\n' +
          '  2. Database server is running\n' +
          '  3. Network connectivity is available'
        );
      }
      
      // Re-throw to prevent app from starting with broken database
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }

  /**
   * Validate that the database schema exists by attempting a simple query
   */
  private async validateDatabaseSchema() {
    try {
      // Try to query the User table to verify schema exists
      // Using findFirst with a limit to avoid fetching data, just check if table exists
      await this.user.findFirst({ take: 0 });
      this.logger.log('✅ Database schema validated');
    } catch (error: any) {
      // If table doesn't exist, provide helpful error
      if (error.message?.includes('does not exist') || error.code === '42P01' || error.code === 'P2021') {
        this.logger.error(
          '❌ Database schema not found. Tables do not exist.\n' +
          'Please run migrations:\n' +
          '  pnpm db:setup\n' +
          '  or\n' +
          '  pnpm migrate\n' +
          '  or\n' +
          '  cd packages/prisma && pnpm prisma migrate deploy'
        );
        throw new Error(
          'Database schema not initialized. Please run migrations: pnpm db:setup'
        );
      }
      // For other errors, just log and continue (might be permission issues)
      this.logger.warn('⚠️  Could not validate schema, but connection is active');
    }
  }
}

