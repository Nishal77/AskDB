import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { SchemaModule } from './modules/schema/schema.module';
import { LlmModule } from './modules/llm/llm.module';
import { QueryModule } from './modules/query/query.module';
import { InsightsModule } from './modules/insights/insights.module';
import { DbModule } from './modules/db/db.module';
import { LoggingModule } from './modules/logging/logging.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';
import { AppModule as RootAppModule } from './modules/app/app.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '../.env', '.env'],
      // Also read from process.env (set by Docker Compose)
      ignoreEnvFile: false,
    }),
    RootAppModule,
    HealthModule,
    DbModule,
    AuthModule,
    SchemaModule,
    LlmModule,
    QueryModule,
    InsightsModule,
    LoggingModule,
    AdminModule,
  ],
})
export class AppModule {}

