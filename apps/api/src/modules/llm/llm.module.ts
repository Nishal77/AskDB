import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { LlmController } from './llm.controller';
import { GuardrailsService } from './guardrails.service';
import { SchemaModule } from '../schema/schema.module';

@Module({
  imports: [SchemaModule],
  controllers: [LlmController],
  providers: [LlmService, GuardrailsService],
  exports: [LlmService, GuardrailsService],
})
export class LlmModule {}

