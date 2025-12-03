import { Module } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  providers: [InsightsService],
  exports: [InsightsService],
})
export class InsightsModule {}

