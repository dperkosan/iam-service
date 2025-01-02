import { Request, Response, NextFunction, RequestHandler } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ValidationError } from '@common/errors/http-status.error';
import logger from '@common/log/app.log';

export const validation = <T extends object>(
  dto: new () => T,
): RequestHandler => {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const dtoInstance = plainToInstance(dto, req.body, {
      enableImplicitConversion: true,
    });

    const errors = await validate(dtoInstance);

    if (errors.length > 0) {
      const errorMessages = errors
        .map((error) => Object.values(error.constraints || {}))
        .flat();

      logger.error('Validation Error:', {
        body: req.body,
        errors: errorMessages,
      });

      return next(new ValidationError(errorMessages));
    }

    req.body = dtoInstance;
    next();
  };
};
