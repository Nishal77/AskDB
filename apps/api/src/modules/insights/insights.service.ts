import { Injectable } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { generateInsightsPrompt } from './insights.prompt';

@Injectable()
export class InsightsService {
  constructor(private llmService: LlmService) {}

  async generateInsights(
    data: any[],
    columns: string[],
    originalQuery: string,
  ): Promise<string> {
    if (data.length === 0) {
      return 'No data returned from the query.';
    }

    const prompt = generateInsightsPrompt(data, columns, originalQuery);

    try {
      const insights = await this.llmService.explainSQL(prompt);
      return insights;
    } catch (error) {
      console.error('Error generating insights:', error);
      return 'Unable to generate insights at this time.';
    }
  }
}

