import dataSource from '@database/config/typeorm.config';
import { redisClient } from '@common/redis/redis.client';
import logger from '@common/log/app.log';

export const gracefulShutdown = async (): Promise<void> => {
  try {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('Database connection closed.');
    }

    if (redisClient.status === 'ready') {
      await redisClient.quit();
      console.log('Redis connection closed.');
    }
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
  }
};
