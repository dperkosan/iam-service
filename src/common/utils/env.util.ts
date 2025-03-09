import { MissingEnvError } from '@common/errors/http-status.error';

const requiredEnvVariables: Record<string, string[]> = {
  common: [
    'NODE_ENV',
    'PORT',
    'FRONTEND_URL',
    'IAM_SERVICE_API_KEY',
    'JWT_SECRET',
    'JWT_TOKEN_AUDIENCE',
    'JWT_TOKEN_ISSUER',
    'JWT_ACCESS_TOKEN_TTL',
    'JWT_REFRESH_TOKEN_TTL',
    'JWT_EMAIL_VERIFICATION_TOKEN_TTL',
    'JWT_FORGOTTEN_PASSWORD_TOKEN_TTL',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM',
  ], // Required in all environments
  test: [
    'DB_HOST',
    'DB_PORT',
    'DB_USERNAME',
    'DB_PASSWORD',
    'REDIS_HOST',
    'REDIS_PORT',
    'REDIS_DB',
  ], // Required only in test environment
  development: [
    'DB_HOST',
    'DB_NAME',
    'DB_PORT',
    'DB_USERNAME',
    'DB_PASSWORD',
    'REDIS_HOST',
    'REDIS_PORT',
    'REDIS_DB',
  ], // Required in dev
  production: ['DATABASE_URL', 'REDIS_URL'], // Required in prod
};

const getEnvVariable = (key: string): string => {
  const value = process.env[key];
  const currentEnv = process.env.NODE_ENV || 'development';

  // Check if the variable is required in the current environment or in common
  const isRequired =
    requiredEnvVariables.common.includes(key) ||
    requiredEnvVariables[currentEnv]?.includes(key);

  // Throw an error only if the variable is required and truly undefined or null
  if (isRequired && (value === undefined || value === null)) {
    throw new MissingEnvError(key);
  }

  return value || '';
};

export default getEnvVariable;
