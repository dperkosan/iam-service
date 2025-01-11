import { MissingEnvError } from '@common/errors/http-status.error';

const requiredEnvVariables: Record<string, string[]> = {
  common: [
    'NODE_ENV',
    'REDIS_PORT',
    'JWT_SECRET',
    'JWT_TOKEN_AUDIENCE',
    'JWT_TOKEN_ISSUER',
    'JWT_ACCESS_TOKEN_TTL',
    'JWT_REFRESH_TOKEN_TTL',
    'JWT_EMAIL_VERIFICATION_TOKEN_TTL',
    'JWT_FORGOTTEN_PASSWORD_TOKEN_TTL',
  ], // Required in all environments
  test: ['DB_HOST', 'DB_NAME_TEST', 'DB_PORT', 'DB_USERNAME', 'DB_PASSWORD'], // Required only in test environment
  development: ['DB_HOST', 'DB_NAME', 'DB_PORT', 'DB_USERNAME', 'DB_PASSWORD'], // Required in dev
  production: ['DATABASE_URL'], // Required in prod
};

const getEnvVariable = (key: string): string => {
  const value = process.env[key];
  const currentEnv = process.env.NODE_ENV || 'development';

  // Check if the variable is required in the current environment or in common
  const isRequired =
    requiredEnvVariables.common.includes(key) ||
    requiredEnvVariables[currentEnv]?.includes(key);

  if (isRequired && !value) {
    throw new MissingEnvError(key);
  }

  return value || '';
};

export default getEnvVariable;
