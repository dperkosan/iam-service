import { Request, Response, NextFunction } from 'express';
import getEnvVariable from '@common/utils/env.util';
import { ForbiddenError } from '@common/errors/http-status.error';
import logger from '@common/log/app.log';

export function apiKeyMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = getEnvVariable('IAM_SERVICE_API_KEY');

  if (!apiKey || apiKey !== validApiKey) {
    logger.warn('🔒 Forbidden: Invalid API key attempt', {
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return next(new ForbiddenError('Forbidden: Invalid API key'));
  }

  next();
}
