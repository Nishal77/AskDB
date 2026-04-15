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

/**
 * Fire-and-forget audit logger.
 * NEVER throws — any database error is swallowed and only logged at warn level.
 * Keeping this non-throwing is critical: it is called from middleware on every
 * request, and an uncaught error here would crash the Node process.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly DEFAULT_LIMIT = 100;

  constructor(private readonly prisma: PrismaService) {}

  async log(dto: AuditLogDto): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: dto.userId ?? null,
          action: dto.action,
          resource: dto.resource,
          resourceId: dto.resourceId ?? null,
          metadata: dto.metadata as any,
          ipAddress: dto.ipAddress ?? null,
          userAgent: dto.userAgent ?? null,
        },
      });
    } catch (error) {
      // Audit logging is non-critical — never let it crash the application.
      const code = (error as any)?.code ?? 'UNKNOWN';
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Audit log skipped [${code}]: ${message}`);
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
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to fetch audit logs: ${message}`);
      return [];
    }
  }
}
