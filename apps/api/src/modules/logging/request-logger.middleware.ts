import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private auditService: AuditService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    // Log request
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const userId = (req as any).user?.id;

      this.auditService.log({
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
        ipAddress: req.ip || req.headers['x-forwarded-for'] as string,
        userAgent: req.headers['user-agent'],
      });
    });

    next();
  }
}

