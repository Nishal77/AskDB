import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AuditService } from './audit.service';
import { RequestLoggerMiddleware } from './request-logger.middleware';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class LoggingModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}

