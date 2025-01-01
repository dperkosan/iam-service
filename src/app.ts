import express, { Request, Response } from 'express';
import dataSource from '@database/config/typeorm.config';
import { authRoutes } from '@modules/iam';

const app = express();

(async () => {
  try {
    await dataSource.initialize();
    console.log('Database connection established.');

    // Middleware
    app.use(express.json());

    // Routes
    app.use('/auth', authRoutes);

    app.get('/', (req: Request, res: Response) => {
      res.send('Hello!');
    });

    // Start Express server
    app.listen(3000, () => {
      console.log('Server is running on http://localhost:3000');
    });
  } catch (error) {
    console.error('Error during Data Source initialization:', error);
    process.exit(1);
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
