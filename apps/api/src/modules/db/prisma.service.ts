import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  private async connectWithRetry(): Promise<void> {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Database connected');
        await this.validateDatabaseSchema();
        return; // success
      } catch (error) {
        const isLast = attempt === MAX_RETRIES;
        const message = error instanceof Error ? error.message : String(error);

        if (isLast) {
          this.logger.error(
            `Database connection failed after ${MAX_RETRIES} attempts — API will start but DB queries will fail until connection recovers`,
          );
          this.logger.error(message);
          // Do NOT throw — let the API start so at least CORS/health routes respond.
          // Individual requests will get a proper DB error when they try to query.
          return;
        }

        this.logger.warn(
          `Database connection attempt ${attempt}/${MAX_RETRIES} failed. Retrying in ${RETRY_DELAY_MS / 1000}s… (${message})`,
        );
        await this.delay(RETRY_DELAY_MS);
      }
    }
  }

  private async validateDatabaseSchema(): Promise<void> {
    try {
      await this.user.findFirst({ take: 0 });
      this.logger.log('Database schema validated');
    } catch (error) {
      if (this.isSchemaError(error)) {
        this.logger.error('Database tables missing — run: pnpm prisma db push');
        throw new Error('Database tables missing. Run: pnpm prisma db push');
      }
      this.logger.warn('Schema check skipped — database is connected but schema check failed');
    }
  }

  private isSchemaError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    return (
      error.message?.includes('does not exist') ||
      (error as any).code === '42P01' ||
      (error as any).code === 'P2021'
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
