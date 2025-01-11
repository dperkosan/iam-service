import Redis from 'ioredis';
import logger from '@common/log/app.log';
import getEnvVariable from '@common/utils/env.util';

const redisClient = new Redis(
  `${getEnvVariable('REDIS_URL')}:${getEnvVariable('REDIS_PORT')}`,
);

// Log errors
redisClient.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

// Log connection events
redisClient.on('connect', () => {
  logger.info('Redis connected successfully.');
});

// Log disconnect events
redisClient.on('close', () => {
  logger.info('Redis connection closed.');
});

export default redisClient;
