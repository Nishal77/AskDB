import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { generateInsightsPrompt } from './insights.prompt';

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(private readonly llmService: LlmService) {}

  async generateInsights(
    data: Record<string, unknown>[],
    columns: string[],
    originalQuery: string,
  ): Promise<string> {
    if (data.length === 0) {
      return 'No data returned from the query.';
    }

    const prompt = generateInsightsPrompt(data, columns, originalQuery);

    try {
      return await this.llmService.explainSQL(prompt);
    } catch (error) {
      this.logger.error('Failed to generate insights', error);
      return 'Unable to generate insights at this time.';
    }
  }
}