import { getEnvConfig } from './env';

export const getDatabaseConfig = () => {
  const config = getEnvConfig();
  
  return {
    url: config.databaseUrl,
  };
};

export const getVectorDbConfig = () => {
  const config = getEnvConfig();
  
  return {
    host: config.vectorDbHost,
    port: config.vectorDbPort,
    database: config.vectorDbDatabase,
    user: config.vectorDbUser,
    password: config.vectorDbPassword,
  };
};

