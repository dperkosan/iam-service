import Redis from 'ioredis';
import logger from '@common/log/app.log';
import getEnvVariable from '@common/utils/env.util';

const isProduction = getEnvVariable('NODE_ENV') === 'production';

const createRedisClient = (): Redis => {
  const client = new Redis(
    isProduction
      ? getEnvVariable('REDIS_URL')
      : `${getEnvVariable('REDIS_HOST')}:${getEnvVariable('REDIS_PORT')}/${getEnvVariable('REDIS_DB')}`,
  );

  // Log errors
  client.on('error', (error) => {
    logger.error('Redis connection error:', error);
  });

  // Log connection events
  client.on('connect', () => {
    logger.info(
      `Redis connected successfully to DB ${getEnvVariable('REDIS_DB')}.`,
    );
  });

  // Log disconnect events
  client.on('close', () => {
    logger.info('Redis connection closed.');
  });

  return client;
};

// Create a singleton instance
const redisClient = createRedisClient();

export { createRedisClient, redisClient };
