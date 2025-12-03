import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { generateNLToSQLPrompt } from './prompt/nl_to_sql.prompt';
import { generateExplainSQLPrompt } from './prompt/explain_sql.prompt';

@Injectable()
export class LlmService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENROUTER_API_KEY') || this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY or OPENAI_API_KEY is not configured');
    }

    // OpenRouter uses OpenAI-compatible API
    const openrouterKey = this.configService.get<string>('OPENROUTER_API_KEY');
    const baseURL = openrouterKey 
      ? 'https://openrouter.ai/api/v1'
      : undefined;

    this.openai = new OpenAI({
      apiKey,
      baseURL,
      defaultHeaders: openrouterKey ? {
        'HTTP-Referer': this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001',
        'X-Title': 'AskYourDatabase',
      } : undefined,
    });
  }

  async generateSQL(
    naturalLanguageQuery: string,
    schemaContext: string,
    examples?: string[],
  ): Promise<string> {
    const prompt = generateNLToSQLPrompt(naturalLanguageQuery, schemaContext, examples);

    const response = await this.openai.chat.completions.create({
      model: this.configService.get<string>('OPENROUTER_MODEL') || this.configService.get<string>('OPENAI_MODEL') || 'openai/gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content:
            'You are a SQL expert. Generate only valid SQL queries without any explanations or markdown formatting.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 1000,
    });

    const sql = response.choices[0]?.message?.content?.trim() || '';
    
    // Clean up SQL - remove markdown code blocks if present
    return sql.replace(/^```sql\n?/i, '').replace(/```\n?$/i, '').trim();
  }

  async explainSQL(sqlQuery: string): Promise<string> {
    const prompt = generateExplainSQLPrompt(sqlQuery);

    const response = await this.openai.chat.completions.create({
      model: this.configService.get<string>('OPENROUTER_MODEL') || this.configService.get<string>('OPENAI_MODEL') || 'openai/gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a SQL expert who explains queries in plain English.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content?.trim() || 'Unable to explain query';
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // OpenRouter supports embeddings through OpenAI-compatible API
    const embeddingModel = this.configService.get<string>('OPENROUTER_EMBEDDING_MODEL') || 'openai/text-embedding-3-small';
    
    const response = await this.openai.embeddings.create({
      model: embeddingModel,
      input: text,
    });

    return response.data[0].embedding;
  }
}

