export interface EnvConfig {
  // Server
  port: number;
  nodeEnv: string;

  // Database
  databaseUrl: string;

  // JWT
  jwtSecret: string;
  jwtExpiresIn: string;

  // OpenRouter / OpenAI
  openrouterApiKey: string;
  openrouterModel: string;
  openaiApiKey: string;
  openaiModel: string;

  // Vector Database
  vectorDbHost: string;
  vectorDbPort: number;
  vectorDbDatabase: string;
  vectorDbUser: string;
  vectorDbPassword: string;

  // App
  appName: string;
  appVersion: string;
}

export const getEnvConfig = (): EnvConfig => {
  return {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    databaseUrl: process.env.DATABASE_URL || '',
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    openrouterApiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '',
    openrouterModel: process.env.OPENROUTER_MODEL || process.env.OPENAI_MODEL || 'openai/gpt-4-turbo-preview',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
    vectorDbHost: process.env.VECTOR_DB_HOST || 'localhost',
    vectorDbPort: parseInt(process.env.VECTOR_DB_PORT || '5432', 10),
    vectorDbDatabase: process.env.VECTOR_DB_DATABASE || 'askyourdatabase',
    vectorDbUser: process.env.VECTOR_DB_USER || 'postgres',
    vectorDbPassword: process.env.VECTOR_DB_PASSWORD || '',
    appName: process.env.APP_NAME || 'AskYourDatabase',
    appVersion: process.env.APP_VERSION || '1.0.0',
  };
};

