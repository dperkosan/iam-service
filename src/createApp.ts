import express from 'express';
import { authRoutes } from '@modules/iam';
import { errorHandler } from '@middleware/error.middleware';

export function createApp() {
  const app = express();

  // Middleware
  app.use(express.json());

  // Routes
  app.use('/auth', authRoutes);

  // Error handling
  app.use(errorHandler);

  return app;
}
