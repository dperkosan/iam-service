import express from 'express';
import { authRoutes } from '@modules/iam';
import { errorHandler } from '@middleware/error.middleware';
import { exampleRoutes } from '@modules/protected-routes-example';
import { apiKeyMiddleware } from '@middleware/apiKey.middleware';

export function createApp() {
  const app = express();

  // Middleware
  app.use(express.json());

  // Apply API Key check Middleware Globally (Before All Routes)
  app.use(apiKeyMiddleware);

  // Routes
  app.use('/auth', authRoutes);
  app.use('/example', exampleRoutes);

  // Error handling
  app.use(errorHandler);

  return app;
}
