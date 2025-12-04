import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { generateNLToSQLPrompt } from './prompt/nl_to_sql.prompt';
import { generateExplainSQLPrompt } from './prompt/explain_sql.prompt';

@Injectable()
export class LlmService implements OnModuleInit {
  private defaultOpenai: OpenAI;
  private readonly isOpenRouter: boolean;
  private readonly defaultApiKey: string;
  private readonly defaultModel: string;
  private readonly fallbackModels: string[];

  constructor(private configService: ConfigService) {
    // Helper function to clean and validate API key
    const cleanApiKey = (key: string | undefined): string | null => {
      if (!key) return null;
      // Remove quotes, whitespace, newlines, and any other unwanted characters
      const cleaned = key
        .trim()
        .replace(/^["']|["']$/g, '') // Remove surrounding quotes
        .replace(/\s+/g, '') // Remove all whitespace
        .replace(/\n|\r/g, ''); // Remove newlines
      return cleaned.length > 0 ? cleaned : null;
    };

    // Priority: OPENROUTER_API_KEY > OPENAI_API_KEY
    const rawOpenrouterKey = this.configService.get<string>('OPENROUTER_API_KEY');
    const rawOpenaiKey = this.configService.get<string>('OPENAI_API_KEY');
    
    const openrouterKey = cleanApiKey(rawOpenrouterKey);
    const openaiKey = cleanApiKey(rawOpenaiKey);
    
    const apiKey = openrouterKey || openaiKey;
    
    if (!apiKey) {
      console.error('❌ No API key found!');
      console.error(`   OPENROUTER_API_KEY: ${rawOpenrouterKey ? `present (length: ${rawOpenrouterKey.length})` : 'not set'}`);
      console.error(`   OPENAI_API_KEY: ${rawOpenaiKey ? `present (length: ${rawOpenaiKey.length})` : 'not set'}`);
      throw new Error(
        'OPENROUTER_API_KEY or OPENAI_API_KEY is not configured. ' +
        'Please set OPENROUTER_API_KEY in your .env file.'
      );
    }

    // Validate OpenRouter key format
    const isOpenRouterKey = openrouterKey && (
      openrouterKey.startsWith('sk-or-v1-') || 
      openrouterKey.startsWith('sk-or-')
    );
    this.isOpenRouter = !!openrouterKey && !!isOpenRouterKey;
    this.defaultApiKey = apiKey;

    // Log which key type is being used (without exposing the actual key)
    if (this.isOpenRouter) {
      console.log('✅ Using OpenRouter API key (from OPENROUTER_API_KEY)');
      console.log(`   Key format: ${openrouterKey.substring(0, 12)}...${openrouterKey.substring(openrouterKey.length - 4)}`);
      console.log(`   Key length: ${openrouterKey.length} characters`);
      console.log(`   Key valid: ${openrouterKey.length >= 50 ? '✓' : '✗ (too short)'}`);
    } else if (openrouterKey && !isOpenRouterKey) {
      console.warn('⚠️  OPENROUTER_API_KEY found but format is invalid');
      console.warn(`   Expected: starts with "sk-or-v1-" or "sk-or-"`);
      console.warn(`   Found: starts with "${openrouterKey.substring(0, Math.min(12, openrouterKey.length))}"`);
      console.warn('   Falling back to OpenAI format...');
    } else if (openaiKey) {
      console.log('⚠️  Using OpenAI API key (OPENROUTER_API_KEY not found, falling back to OPENAI_API_KEY)');
    }

    // Get model configuration with proper priority
    const openrouterModel = this.configService.get<string>('OPENROUTER_MODEL');
    const openaiModel = this.configService.get<string>('OPENAI_MODEL');
    
    this.defaultModel = this.isOpenRouter
      ? (openrouterModel || openaiModel || 'openai/gpt-4-turbo-preview')
      : (openaiModel || 'gpt-4-turbo-preview');
    
    // Define fallback models (free tier models from OpenRouter)
    // Order: primary model -> free alternatives
    // Can be customized via OPENROUTER_FALLBACK_MODELS env var (comma-separated)
    const fallbackModelsEnv = this.configService.get<string>('OPENROUTER_FALLBACK_MODELS');
    const defaultFallbacks = [
      'tngtech/deepseek-r1t2-chimera:free', // Free DeepSeek model
      'qwen/qwen3-coder:free', // Free Qwen coder model
    ];
    
    // Parse fallback models from env or use defaults
    const customFallbacks = fallbackModelsEnv
      ? fallbackModelsEnv.split(',').map(m => m.trim()).filter(Boolean)
      : defaultFallbacks;
    
    // Build fallback list: primary model first, then custom/default fallbacks
    this.fallbackModels = [
      this.defaultModel, // Primary model (from config or default)
      ...customFallbacks, // Custom or default fallback models
    ];
    
    // Remove duplicates while preserving order
    this.fallbackModels = [...new Set(this.fallbackModels)];
    
    console.log(`📋 Configured model: ${this.defaultModel}`);
    console.log(`   Model source: ${openrouterModel ? 'OPENROUTER_MODEL' : openaiModel ? 'OPENAI_MODEL' : 'default'}`);
    console.log(`🔄 Fallback models: ${this.fallbackModels.join(' → ')}`);

    // OpenRouter uses OpenAI-compatible API
    const baseURL = this.isOpenRouter 
      ? 'https://openrouter.ai/api/v1'
      : undefined;

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';

    // Configure OpenAI client for OpenRouter
    this.defaultOpenai = new OpenAI({
      apiKey: this.defaultApiKey,
      baseURL,
      defaultHeaders: this.isOpenRouter ? {
        'HTTP-Referer': frontendUrl,
        'X-Title': 'AskYourDatabase',
      } : undefined,
    });

    console.log(`🔧 LLM Service initialized with ${this.isOpenRouter ? 'OpenRouter' : 'OpenAI'} API`);
    console.log(`   Base URL: ${baseURL || 'https://api.openai.com/v1'}`);
    console.log(`   Frontend URL: ${frontendUrl}`);
  }

  async onModuleInit() {
    // Test the API key on module initialization (non-blocking)
    if (this.isOpenRouter) {
      console.log('🧪 Testing OpenRouter API key...');
      // Run test asynchronously without blocking startup
      this.testApiKey().then(() => {
        console.log('✅ OpenRouter API key is valid and working!');
      }).catch((error: any) => {
        console.error('❌ OpenRouter API key test failed:', error.message);
        console.error('   Please verify your OPENROUTER_API_KEY in .env file');
        console.error('   The service will continue, but queries may fail.');
        // Don't throw - allow the service to start
      });
    }
  }

  private async testApiKey(): Promise<void> {
    try {
      // Make a simple test request to verify the key works
      const response = await this.defaultOpenai.chat.completions.create({
        model: 'openai/gpt-3.5-turbo', // Use a cheaper model for testing
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
      
      console.log(`   Test response received: "${response.choices[0].message.content}"`);
    } catch (error: any) {
      if (error.status === 401 || error.code === 'invalid_api_key') {
        const keyPreview = this.defaultApiKey.substring(0, 12) + '...' + this.defaultApiKey.substring(this.defaultApiKey.length - 4);
        throw new Error(
          `Invalid API key - authentication failed.\n` +
          `Key being used: ${keyPreview}\n` +
          `Please verify the key is correct and active at https://openrouter.ai/keys`
        );
      } else if (error.status === 402) {
        throw new Error('Insufficient credits. Please add credits to your OpenRouter account.');
      } else if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      throw error;
    }
  }

  private getOpenAIClient(userOpenRouterKey?: string | null): OpenAI {
    // If user has their own OpenRouter key, use it (priority: user key > system key)
    if (userOpenRouterKey && userOpenRouterKey.trim()) {
      // Clean the user key
      const cleanedKey = userOpenRouterKey
        .trim()
        .replace(/^["']|["']$/g, '')
        .replace(/\s+/g, '')
        .replace(/\n|\r/g, '');
      
      const isValidKey = (
        cleanedKey.startsWith('sk-or-v1-') || 
        cleanedKey.startsWith('sk-or-') || 
        cleanedKey.startsWith('sk-')
      ) && cleanedKey.length > 20;
      
      if (isValidKey) {
        console.log('🔑 Using user-provided OpenRouter API key');
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
        return new OpenAI({
          apiKey: cleanedKey,
          baseURL: 'https://openrouter.ai/api/v1',
          defaultHeaders: {
            'HTTP-Referer': frontendUrl,
            'X-Title': 'AskYourDatabase',
          },
        });
      } else {
        console.warn('⚠️  User provided invalid API key format, falling back to system key');
        console.warn(`   Key preview: ${cleanedKey.substring(0, 12)}... (length: ${cleanedKey.length})`);
      }
    }
    
    // Otherwise use default (system-wide) key from .env
    if (this.isOpenRouter) {
      console.log('🔑 Using system OpenRouter API key from .env');
    }
    return this.defaultOpenai;
  }

  async generateSQL(
    naturalLanguageQuery: string,
    schemaContext: string,
    examples?: string[],
    userOpenRouterKey?: string | null,
  ): Promise<string> {
    const prompt = generateNLToSQLPrompt(naturalLanguageQuery, schemaContext, examples);
    const openai = this.getOpenAIClient(userOpenRouterKey);

    // Try models in fallback order
    const modelsToTry = this.fallbackModels;
    let lastError: any = null;

    console.log(`🤖 Generating SQL with fallback models`);
    console.log(`   Query: "${naturalLanguageQuery.substring(0, 50)}${naturalLanguageQuery.length > 50 ? '...' : ''}"`);

    for (let i = 0; i < modelsToTry.length; i++) {
      const model = modelsToTry[i];
      const isLastAttempt = i === modelsToTry.length - 1;
      
      try {
        console.log(`   Attempt ${i + 1}/${modelsToTry.length}: Trying model "${model}"`);
        
        const response = await openai.chat.completions.create({
          model,
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
        
        if (!sql) {
          throw new Error('Empty response from LLM');
        }

        // Clean up SQL - remove markdown code blocks if present
        const cleanedSQL = sql.replace(/^```sql\n?/i, '').replace(/```\n?$/i, '').trim();
        console.log(`✅ Generated SQL query using model "${model}" (${cleanedSQL.length} chars)`);
        return cleanedSQL;
      } catch (error: any) {
        lastError = error;
        const isRateLimit = error.status === 429;
        const isAuthError = error.status === 401 || error.code === 'invalid_api_key';
        const isCreditsError = error.status === 402;
        const isNetworkError = error.message?.includes('network') || error.message?.includes('ECONNREFUSED');
        
        // Don't retry on auth errors or network errors - these won't be fixed by trying another model
        if (isAuthError || isNetworkError) {
          console.error(`❌ Error with model "${model}": ${error.message}`);
          break; // Stop trying other models
        }
        
        // Log the error but continue to next model
        if (isRateLimit || isCreditsError) {
          console.warn(`⚠️  Model "${model}" failed (${error.status}): ${error.message}`);
          console.warn(`   Trying next fallback model...`);
        } else {
          console.warn(`⚠️  Model "${model}" failed: ${error.message}`);
          if (!isLastAttempt) {
            console.warn(`   Trying next fallback model...`);
          }
        }
        
        // If this is the last model, we'll throw the error
        if (isLastAttempt) {
          break;
        }
      }
    }

    // All models failed - throw the last error with helpful message
    console.error('❌ All models failed to generate SQL');
    console.error('   Last error:', {
      status: lastError?.status,
      code: lastError?.code,
      message: lastError?.message,
    });
    
    // Handle specific error cases
    if (lastError?.status === 401 || lastError?.code === 'invalid_api_key') {
      const keyPreview = this.defaultApiKey.substring(0, 12) + '...' + this.defaultApiKey.substring(this.defaultApiKey.length - 4);
      throw new Error(
        `Invalid API key. Please check your OPENROUTER_API_KEY in .env file.\n` +
        `Key being used: ${keyPreview}\n` +
        `Make sure:\n` +
        `1. The key is correct and doesn't have extra spaces or quotes\n` +
        `2. The key is active and has credits\n` +
        `3. The key format is: sk-or-v1-...`
      );
    } else if (lastError?.status === 429) {
      throw new Error('API rate limit exceeded on all models. Please try again later.');
    } else if (lastError?.status === 402) {
      throw new Error('Insufficient credits on all models. Please add credits to your OpenRouter account or use free tier models.');
    } else if (lastError?.message?.includes('401')) {
      throw new Error('Authentication failed. Please verify your OPENROUTER_API_KEY is correct and active.');
    } else if (lastError?.message?.includes('network') || lastError?.message?.includes('ECONNREFUSED')) {
      throw new Error('Network error. Please check your internet connection and try again.');
    }
    throw new Error(`Failed to generate SQL with all models. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  async explainSQL(sqlQuery: string, userOpenRouterKey?: string | null): Promise<string> {
    const prompt = generateExplainSQLPrompt(sqlQuery);
    const openai = this.getOpenAIClient(userOpenRouterKey);

    // Try models in fallback order
    const modelsToTry = this.fallbackModels;
    let lastError: any = null;

    for (let i = 0; i < modelsToTry.length; i++) {
      const model = modelsToTry[i];
      const isLastAttempt = i === modelsToTry.length - 1;
      
      try {
        const response = await openai.chat.completions.create({
          model,
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

        const explanation = response.choices[0]?.message?.content?.trim() || 'Unable to explain query';
        if (i > 0) {
          console.log(`✅ Explained SQL using fallback model "${model}"`);
        }
        return explanation;
      } catch (error: any) {
        lastError = error;
        const isAuthError = error.status === 401 || error.code === 'invalid_api_key';
        const isNetworkError = error.message?.includes('network') || error.message?.includes('ECONNREFUSED');
        
        // Don't retry on auth errors or network errors
        if (isAuthError || isNetworkError) {
          break;
        }
        
        // If this is the last model, we'll return error message
        if (isLastAttempt) {
          break;
        }
      }
    }

    // All models failed - return error message
    console.error('❌ All models failed to explain SQL');
    return `Unable to explain query: ${lastError?.message || 'All models failed'}`;
  }

  async generateEmbedding(text: string, userOpenRouterKey?: string | null): Promise<number[]> {
    // OpenRouter supports embeddings through OpenAI-compatible API
    const embeddingModel = this.configService.get<string>('OPENROUTER_EMBEDDING_MODEL') || 
                          this.configService.get<string>('OPENAI_EMBEDDING_MODEL') ||
                          'openai/text-embedding-3-small';
    const openai = this.getOpenAIClient(userOpenRouterKey);
    
    try {
      const response = await openai.embeddings.create({
        model: embeddingModel,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error: any) {
      console.error('❌ Error generating embedding:', error.message);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }
}
