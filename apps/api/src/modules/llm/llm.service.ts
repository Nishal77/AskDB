import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { generateNLToSQLPrompt } from './prompt/nl_to_sql.prompt';
import { generateExplainSQLPrompt } from './prompt/explain_sql.prompt';

interface ApiError extends Error {
  status?: number;
  code?: string;
}

@Injectable()
export class LlmService implements OnModuleInit {
  private readonly logger = new Logger(LlmService.name);
  private readonly defaultOpenai: OpenAI;
  private readonly isOpenRouter: boolean;
  private readonly defaultApiKey: string;
  private readonly defaultModel: string;
  private readonly fallbackModels: string[];

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.initializeApiKey();
    this.defaultApiKey = apiKey.key;
    this.isOpenRouter = apiKey.isOpenRouter;

    this.defaultModel = this.initializeModel();
    this.fallbackModels = this.initializeFallbackModels();
    this.defaultOpenai = this.createOpenAIClient(apiKey.key);
  }

  async onModuleInit() {
    if (this.isOpenRouter) {
      this.testApiKey().catch((error) => {
        this.logger.warn('API key test failed', error);
      });
    }
  }

  async generateSQL(
    naturalLanguageQuery: string,
    schemaContext: string,
    examples?: string[],
    userOpenRouterKey?: string | null,
  ): Promise<string> {
    const prompt = generateNLToSQLPrompt(naturalLanguageQuery, schemaContext, examples);
    const openai = this.getOpenAIClient(userOpenRouterKey);

    return this.tryModelsWithFallback(
      openai,
      this.fallbackModels,
      (client, model) =>
        this.createChatCompletion(client, model, [
          {
            role: 'system',
            content:
              'You are a SQL expert. Generate only valid SQL queries without any explanations or markdown formatting.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ]),
      'Failed to generate SQL',
    );
  }

  async explainSQL(sqlQuery: string, userOpenRouterKey?: string | null): Promise<string> {
    const prompt = generateExplainSQLPrompt(sqlQuery);
    const openai = this.getOpenAIClient(userOpenRouterKey);

    try {
      return await this.tryModelsWithFallback(
        openai,
        this.fallbackModels,
        (client, model) =>
          this.createChatCompletion(client, model, [
            {
              role: 'system',
              content: 'You are a SQL expert who explains queries in plain English.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ]),
        'Unable to explain query',
      );
    } catch {
      return 'Unable to explain query';
    }
  }

  async generateEmbedding(text: string, userOpenRouterKey?: string | null): Promise<number[]> {
    const embeddingModel =
      this.configService.get<string>('OPENROUTER_EMBEDDING_MODEL') ||
      this.configService.get<string>('OPENAI_EMBEDDING_MODEL') ||
      'openai/text-embedding-3-small';
    const openai = this.getOpenAIClient(userOpenRouterKey);

    try {
      const response = await openai.embeddings.create({
        model: embeddingModel,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate embedding: ${message}`);
    }
  }

  private initializeApiKey(): { key: string; isOpenRouter: boolean } {
    const cleanApiKey = (key: string | undefined): string | null => {
      if (!key) return null;
      const cleaned = key
        .trim()
        .replace(/^["']|["']$/g, '')
        .replace(/\s+/g, '')
        .replace(/\n|\r/g, '');
      return cleaned.length > 0 ? cleaned : null;
    };

    const rawOpenrouterKey = this.configService.get<string>('OPENROUTER_API_KEY');
    const rawOpenaiKey = this.configService.get<string>('OPENAI_API_KEY');
    
    const openrouterKey = cleanApiKey(rawOpenrouterKey);
    const openaiKey = cleanApiKey(rawOpenaiKey);
    const apiKey = openrouterKey || openaiKey;
    
    if (!apiKey) {
      throw new Error('API key not configured. Set OPENROUTER_API_KEY or OPENAI_API_KEY in .env');
    }

    const isOpenRouterKey =
      openrouterKey &&
      (openrouterKey.startsWith('sk-or-v1-') || openrouterKey.startsWith('sk-or-'));

    return {
      key: apiKey,
      isOpenRouter: !!openrouterKey && !!isOpenRouterKey,
    };
  }

  private initializeModel(): string {
    const openrouterModel = this.configService.get<string>('OPENROUTER_MODEL');
    const openaiModel = this.configService.get<string>('OPENAI_MODEL');
    
    return this.isOpenRouter
      ? openrouterModel || openaiModel || 'openai/gpt-4-turbo-preview'
      : openaiModel || 'gpt-4-turbo-preview';
  }

  private initializeFallbackModels(): string[] {
    const fallbackModelsEnv = this.configService.get<string>('OPENROUTER_FALLBACK_MODELS');
    const defaultFallbacks = [
      'tngtech/deepseek-r1t2-chimera:free',
      'qwen/qwen3-coder:free',
    ];
    
    const customFallbacks = fallbackModelsEnv
      ? fallbackModelsEnv.split(',').map((m) => m.trim()).filter(Boolean)
      : defaultFallbacks;
    
    const fallbackModels = [this.defaultModel, ...customFallbacks];
    return [...new Set(fallbackModels)];
  }

  private createOpenAIClient(apiKey: string): OpenAI {
    const baseURL = this.isOpenRouter ? 'https://openrouter.ai/api/v1' : undefined;
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';

    return new OpenAI({
      apiKey,
      baseURL,
      defaultHeaders: this.isOpenRouter
        ? {
        'HTTP-Referer': frontendUrl,
        'X-Title': 'AskYourDatabase',
          }
        : undefined,
    });
  }

  private async testApiKey(): Promise<void> {
    try {
      const response = await this.defaultOpenai.chat.completions.create({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Say "test"',
          },
        ],
        max_tokens: 5,
      });
      
      if (!response.choices[0]?.message?.content) {
        throw new Error('Empty response from API');
      }
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.status === 401 || apiError.code === 'invalid_api_key') {
        const keyPreview =
          this.defaultApiKey.substring(0, 12) +
          '...' +
          this.defaultApiKey.substring(this.defaultApiKey.length - 4);
        throw new Error(`Invalid API key: ${keyPreview}. Verify at https://openrouter.ai/keys`);
      } else if (apiError.status === 402) {
        throw new Error('Insufficient credits. Add credits to your OpenRouter account');
      } else if (apiError.status === 429) {
        throw new Error('Rate limit exceeded. Try again later');
      }
      throw error;
    }
  }

  private getOpenAIClient(userOpenRouterKey?: string | null): OpenAI {
    if (userOpenRouterKey?.trim()) {
      const cleanedKey = this.cleanApiKey(userOpenRouterKey);
      if (this.isValidApiKey(cleanedKey)) {
        const frontendUrl =
          this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
        return new OpenAI({
          apiKey: cleanedKey,
          baseURL: 'https://openrouter.ai/api/v1',
          defaultHeaders: {
            'HTTP-Referer': frontendUrl,
            'X-Title': 'AskYourDatabase',
          },
        });
      }
    }
    
    return this.defaultOpenai;
  }

  private cleanApiKey(key: string): string {
    return key
      .trim()
      .replace(/^["']|["']$/g, '')
      .replace(/\s+/g, '')
      .replace(/\n|\r/g, '');
  }

  private isValidApiKey(key: string): boolean {
    return (
      (key.startsWith('sk-or-v1-') ||
        key.startsWith('sk-or-') ||
        key.startsWith('sk-')) &&
      key.length > 20
    );
  }

  private async tryModelsWithFallback<T>(
    openai: OpenAI,
    models: string[],
    attemptFn: (openai: OpenAI, model: string) => Promise<T>,
    errorMessage: string,
  ): Promise<T> {
    let lastError: ApiError | null = null;

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      const isLastAttempt = i === models.length - 1;

      try {
        return await attemptFn(openai, model);
      } catch (error) {
        lastError = error as ApiError;
        const shouldStop = this.shouldStopRetrying(lastError);

        if (shouldStop || isLastAttempt) {
          break;
        }
      }
    }

    throw this.createErrorFromLastAttempt(lastError, errorMessage);
  }

  private shouldStopRetrying(error: ApiError): boolean {
    const isAuthError = error.status === 401 || error.code === 'invalid_api_key';
    const isNetworkError =
      error.message?.includes('network') || error.message?.includes('ECONNREFUSED');
    return isAuthError || isNetworkError;
  }

  private async createChatCompletion(
    openai: OpenAI,
    model: string,
    messages: Array<{ role: string; content: string }>,
  ): Promise<string> {
        const response = await openai.chat.completions.create({
          model,
      messages: messages as any,
      temperature: 0.1,
      max_tokens: 1000,
        });

    const content = response.choices[0]?.message?.content?.trim() || '';

    if (!content) {
      throw new Error('Empty response from LLM');
        }

    return content.replace(/^```sql\n?/i, '').replace(/```\n?$/i, '').trim();
  }

  private createErrorFromLastAttempt(lastError: ApiError | null, defaultMessage: string): Error {
    if (!lastError) {
      return new Error(defaultMessage);
    }

    if (lastError.status === 401 || lastError.code === 'invalid_api_key') {
      const keyPreview =
        this.defaultApiKey.substring(0, 12) +
        '...' +
        this.defaultApiKey.substring(this.defaultApiKey.length - 4);
      return new Error(`Invalid API key: ${keyPreview}. Check OPENROUTER_API_KEY in .env`);
        }
        
    if (lastError.status === 429) {
      return new Error('Rate limit exceeded. Try again later');
        }

    if (lastError.status === 402) {
      return new Error('Insufficient credits. Add credits or use free tier models');
  }

    if (lastError.message?.includes('401')) {
      return new Error('Authentication failed. Verify OPENROUTER_API_KEY is correct');
    }

    if (
      lastError.message?.includes('network') ||
      lastError.message?.includes('ECONNREFUSED')
    ) {
      return new Error('Network error. Check your connection');
    }

    return new Error(`${defaultMessage}: ${lastError.message || 'Unknown error'}`);
  }
}
