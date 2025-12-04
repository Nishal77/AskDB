import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected');
      await this.validateDatabaseSchema();
    } catch (error) {
      this.handleConnectionError(error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  private async validateDatabaseSchema() {
    try {
      await this.user.findFirst({ take: 0 });
      this.logger.log('Database schema validated');
    } catch (error) {
      if (this.isSchemaError(error)) {
        this.logger.error('Database tables missing. Run migrations: pnpm migrate');
        throw new Error('Database tables missing. Run migrations: pnpm migrate');
      }
      this.logger.warn('Schema check failed, but database is connected');
    }
  }

  private handleConnectionError(error: unknown) {
    if (!(error instanceof Error)) {
      this.logger.error('Unable to connect to database');
      return;
    }

    this.logger.error('Database connection failed', error);

    if (error.message?.includes('does not exist')) {
      this.logger.error('Database tables missing. Run migrations: pnpm migrate');
    } else if (error.message?.includes('P1001') || error.message?.includes('connect')) {
      this.logger.error('Check DATABASE_URL and ensure database server is running');
    }
  }

  private isSchemaError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }
    return (
      error.message?.includes('does not exist') ||
      (error as any).code === '42P01' ||
      (error as any).code === 'P2021'
    );
    }
  }