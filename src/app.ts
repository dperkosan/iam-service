import dataSource from '@database/config/typeorm.config';
import logger from '@common/log/app.log';
import { redisClient } from '@redis/redis.client';
import { gracefulShutdown } from '@common/utils/shutdown.util';
import { createApp } from 'src/createApp';

const app = createApp();

(async () => {
  try {
    // Initialize Redis connection
    await redisClient.ping();
    console.log('Redis connection established.');

    // Initialize database connection
    await dataSource.initialize();
    console.log('Database connection established.');

    // Start Express server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Error during initialization:', error);
    process.emit('SIGINT');
  }
})();

// Graceful Shutdown Handlers
process.on('SIGINT', async () => {
  await gracefulShutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await gracefulShutdown();
  process.exit(0);
});
