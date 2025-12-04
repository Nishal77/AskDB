export interface EnvConfig {
  // Server
  port: number;
  nodeEnv: string;

  // Database
  databaseUrl: string;

  // JWT
  jwtSecret: string;
  jwtExpiresIn: string;

  // OpenRouter / OpenAI (at least one API key is required)
  openrouterApiKey: string;
  openrouterModel: string;
  openaiApiKey?: string;
  openaiModel?: string;

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
  const getRequired = (key: string): string => {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  };

  const getOptional = (key: string): string | undefined => {
    return process.env[key];
  };

  const getNumber = (key: string): number => {
    const value = getRequired(key);
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error(`Invalid number for environment variable: ${key}`);
    }
    return parsed;
  };

  // Check if at least one API key is provided
  const openrouterApiKey = getOptional('OPENROUTER_API_KEY');
  const openaiApiKey = getOptional('OPENAI_API_KEY');
  
  if (!openrouterApiKey && !openaiApiKey) {
    throw new Error(
      'Missing required API key. Set either OPENROUTER_API_KEY or OPENAI_API_KEY in .env'
    );
  }

  // Determine primary API key and model (OpenRouter takes precedence)
  const primaryApiKey = openrouterApiKey || openaiApiKey!;
  const primaryModel = 
    (openrouterApiKey ? getOptional('OPENROUTER_MODEL') : null) ||
    (openaiApiKey ? getOptional('OPENAI_MODEL') : null) ||
    (openrouterApiKey ? 'openai/gpt-4-turbo-preview' : 'gpt-4-turbo-preview');

  return {
    port: getNumber('PORT'),
    nodeEnv: getRequired('NODE_ENV'),
    databaseUrl: getRequired('DATABASE_URL'),
    jwtSecret: getRequired('JWT_SECRET'),
    jwtExpiresIn: getRequired('JWT_EXPIRES_IN'),
    // Primary API key (OpenRouter if available, otherwise OpenAI)
    openrouterApiKey: primaryApiKey,
    openrouterModel: primaryModel,
    // Optional OpenAI config (only set if provided)
    openaiApiKey: openaiApiKey,
    openaiModel: getOptional('OPENAI_MODEL'),
    vectorDbHost: getRequired('VECTOR_DB_HOST'),
    vectorDbPort: getNumber('VECTOR_DB_PORT'),
    vectorDbDatabase: getRequired('VECTOR_DB_DATABASE'),
    vectorDbUser: getRequired('VECTOR_DB_USER'),
    vectorDbPassword: getRequired('VECTOR_DB_PASSWORD'),
    appName: getRequired('APP_NAME'),
    appVersion: getRequired('APP_VERSION'),
  };
};