import express from 'express';
import dataSource from '@database/config/typeorm.config';
import { authRoutes } from '@modules/iam';
import { errorHandler } from '@middleware/error.middleware';
import logger from '@common/log/app.log';

const app = express();

(async () => {
  try {
    await dataSource.initialize();
    console.log('Database connection established.');

    // Middleware
    app.use(express.json());

    // Routes
    app.use('/auth', authRoutes);

    // error handling
    app.use(errorHandler);

    // Start Express server
    app.listen(3000, () => {
      console.log('Server is running on http://localhost:3000');
    });
  } catch (error) {
    logger.error('Error during Data Source initialization:', error);
    process.emit('SIGINT');
  }
})();

// Graceful Shutdown Handlers
process.on('SIGINT', async () => {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
    console.log('Database connection closed.');
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
    console.log('Database connection closed.');
  }
  process.exit(0);
});
