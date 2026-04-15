import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggerMiddleware.name);

  constructor(private readonly auditService: AuditService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const userId = (req as any).user?.id;

      // Fire-and-forget — must never throw or reject into the event loop.
      this.auditService
        .log({
          userId,
          action: `${req.method} ${req.path}`,
          resource: 'api',
          metadata: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            query: req.query,
          },
          ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip,
          userAgent: req.headers['user-agent'],
        })
        .catch((err) => {
          // Last-resort safety net — AuditService.log already swallows errors,
          // but if something unexpected escapes we catch it here too.
          this.logger.warn(`RequestLogger: audit log failed — ${err?.message ?? err}`);
        });
    });

    next();
  }
}
