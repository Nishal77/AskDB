import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';

export interface AuditLogDto {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(dto: AuditLogDto) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          userId: dto.userId,
          action: dto.action,
          resource: dto.resource,
          resourceId: dto.resourceId,
          metadata: dto.metadata,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
        },
      });
    } catch (error: any) {
      // Silently fail if database tables don't exist yet
      // This allows the API to start before migrations are run
      if (error?.code === 'P2021' || error?.code === '42P01') {
        console.warn('AuditLog table does not exist yet. Run migrations: pnpm --filter @askdb/prisma migrate dev');
        return null;
      }
      // Re-throw other errors
      throw error;
    }
  }

  async getAuditLogs(userId?: string, limit: number = 100) {
    try {
      const where = userId ? { userId } : {};
      return await this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (error: any) {
      // Return empty array if tables don't exist
      if (error?.code === 'P2021' || error?.code === '42P01') {
        console.warn('AuditLog table does not exist yet. Run migrations: pnpm --filter @askdb/prisma migrate dev');
        return [];
      }
      throw error;
    }
  }
}

