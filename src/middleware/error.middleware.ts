import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from '@common/errors/http-status.error';

export const errorHandler = (
  err: AppError | Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  console.error(err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
      status: 'error',
      isOperational: err.isOperational,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  } else {
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
