import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { GuardrailsService } from './guardrails.service';
import { SchemaModule } from '../schema/schema.module';

@Module({
  imports: [SchemaModule],
  providers: [LlmService, GuardrailsService],
  exports: [LlmService, GuardrailsService],
})
export class LlmModule {}

