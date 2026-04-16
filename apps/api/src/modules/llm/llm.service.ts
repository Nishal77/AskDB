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
    const keyPreview = this.defaultApiKey.substring(0, 16) + '…';
    this.logger.log(`LLM ready — model: ${this.defaultModel}, key: ${keyPreview}, fallbacks: ${this.fallbackModels.length - 1}`);
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
      ? openrouterModel || openaiModel || 'qwen/qwen3-coder:free'
      : openaiModel || 'gpt-4-turbo-preview';
  }

  private initializeFallbackModels(): string[] {
    const fallbackModelsEnv = this.configService.get<string>('OPENROUTER_FALLBACK_MODELS');
    // Verified-live free models as of 2026-04, ordered by SQL quality
    const defaultFallbacks = [
      'openai/gpt-oss-120b:free',
      'nvidia/nemotron-3-super-120b-a12b:free',
      'google/gemma-4-31b-it:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'google/gemma-3-27b-it:free',
      'nousresearch/hermes-3-llama-3.1-405b:free',
      'openai/gpt-oss-20b:free',
    ];

    const customFallbacks = fallbackModelsEnv
      ? fallbackModelsEnv.split(',').map((m) => m.trim()).filter(Boolean)
      : defaultFallbacks;

    // Primary model first, then fallbacks (deduped)
    return [...new Set([this.defaultModel, ...customFallbacks])];
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
        this.logger.debug(`Trying model [${i + 1}/${models.length}]: ${model}`);
        return await attemptFn(openai, model);
      } catch (error) {
        lastError = error as ApiError;
        const reason = this.classifyError(lastError);

        this.logger.warn(
          `Model ${model} failed (${reason}) — ${isLastAttempt ? 'no more fallbacks' : 'trying next'}`,
        );

        // Stop immediately only for bad-key or network-down errors.
        // 404 (dead model), 429 (rate limit), 402 (credits) all try next fallback.
        if (reason === 'auth' || reason === 'network') {
          break;
        }

        if (isLastAttempt) {
          break;
        }
      }
    }

    throw this.createErrorFromLastAttempt(lastError, errorMessage);
  }

  private classifyError(error: ApiError): 'auth' | 'network' | 'ratelimit' | 'nocredits' | 'nomodel' | 'other' {
    if (error.status === 401 || error.code === 'invalid_api_key') return 'auth';
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('ENOTFOUND') || error.message?.includes('network')) return 'network';
    if (error.status === 429) return 'ratelimit';
    if (error.status === 402) return 'nocredits';
    if (error.status === 404 || error.message?.includes('No endpoints found')) return 'nomodel';
    return 'other';
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
    if (!lastError) return new Error(defaultMessage);

    const reason = this.classifyError(lastError);

    if (reason === 'auth') {
      const keyPreview =
        this.defaultApiKey.substring(0, 12) + '...' + this.defaultApiKey.substring(this.defaultApiKey.length - 4);
      return new Error(`Invalid API key: ${keyPreview}. Check OPENROUTER_API_KEY in .env`);
    }
    if (reason === 'ratelimit') {
      return new Error('All AI models are rate-limited right now. Please wait a moment and try again.');
    }
    if (reason === 'nocredits') {
      return new Error('Insufficient credits on your OpenRouter account.');
    }
    if (reason === 'nomodel') {
      return new Error('All fallback AI models are temporarily unavailable. Please try again shortly.');
    }
    if (reason === 'network') {
      return new Error('Cannot reach AI service. Check your internet connection.');
    }

    return new Error(`${defaultMessage}: ${lastError.message || 'Unknown error'}`);
  }
}
