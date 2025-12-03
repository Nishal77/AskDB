import { Module } from '@nestjs/common';
import { QueryController } from './query.controller';
import { QueryService } from './query.service';
import { QueryHistoryService } from './query.history.service';
import { DbModule } from '../db/db.module';
import { LlmModule } from '../llm/llm.module';
import { SchemaModule } from '../schema/schema.module';
import { InsightsModule } from '../insights/insights.module';

@Module({
  imports: [DbModule, LlmModule, SchemaModule, InsightsModule],
  controllers: [QueryController],
  providers: [QueryService, QueryHistoryService],
  exports: [QueryService, QueryHistoryService],
})
export class QueryModule {}

