import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';

export interface AuditLogDto {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

interface PrismaError extends Error {
  code?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly DEFAULT_LIMIT = 100;

  constructor(private readonly prisma: PrismaService) {}

  async log(dto: AuditLogDto) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          userId: dto.userId,
          action: dto.action,
          resource: dto.resource,
          resourceId: dto.resourceId,
          metadata: dto.metadata as any,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
        },
      });
    } catch (error) {
      if (this.isSchemaError(error)) {
        this.logger.warn('AuditLog table missing. Run migrations: pnpm migrate');
        return null;
      }
      throw error;
    }
  }

  async getAuditLogs(userId?: string, limit: number = this.DEFAULT_LIMIT) {
    try {
      const where = userId ? { userId } : {};
      return await this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (error) {
      if (this.isSchemaError(error)) {
        this.logger.warn('AuditLog table missing. Run migrations: pnpm migrate');
        return [];
      }
      throw error;
    }
  }

  private isSchemaError(error: unknown): boolean {
    const prismaError = error as PrismaError;
    return prismaError?.code === 'P2021' || prismaError?.code === '42P01';
  }
}