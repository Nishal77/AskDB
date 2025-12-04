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
      // Try multiple paths to find .env file (root, parent, current directory)
      // Paths are relative to apps/api/src/
      envFilePath: [
        '../../.env',      // Root .env (from apps/api/src/ -> root)
        '../.env',         // Parent .env
        '.env',            // Current directory .env
        process.env.ENV_FILE || '', // Custom path if set
      ].filter(Boolean), // Remove empty strings
      // Also read from process.env (set by Docker Compose or environment)
      ignoreEnvFile: false,
      // Expand variables in .env file
      expandVariables: true,
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

