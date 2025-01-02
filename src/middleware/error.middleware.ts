import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from '@common/errors/http-status.error';
import logger from '@common/log/app.log';

export const errorHandler = (
  err: AppError | Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    logger.warn('Operational Error:', {
      message: err.message,
      stack: err.stack,
    });
    res.status(err.statusCode).json({
      message: err.message,
      status: 'error',
      isOperational: err.isOperational,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  } else {
    logger.error('Unhandled Error:', { error: err });
    res.status(500).json({
      message: 'Internal Server Error',
      status: 'error',
    });
  }
};

export const handleRouteErrors =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
