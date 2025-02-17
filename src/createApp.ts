import express from 'express';
import { authRoutes } from '@modules/iam';
import { errorHandler } from '@middleware/error.middleware';
import { exampleRoutes } from '@modules/protected-routes-example';

export function createApp() {
  const app = express();

  // Middleware
  app.use(express.json());

  // Routes
  app.use('/auth', authRoutes);
  app.use('/example', exampleRoutes);

  // Error handling
  app.use(errorHandler);

  return app;
}
