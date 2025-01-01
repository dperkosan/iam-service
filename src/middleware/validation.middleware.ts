import { Request, Response, NextFunction, RequestHandler } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

export const validation = <T extends object>(
  dto: new () => T,
): RequestHandler => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const dtoInstance = plainToInstance(dto, req.body, {
      enableImplicitConversion: true,
    });

    const errors = await validate(dtoInstance);

    if (errors.length > 0) {
      res.status(400).json({
        errors: errors
          .map((error) => Object.values(error.constraints || {}))
          .flat(),
      });
      return;
    }

    req.body = dtoInstance;
    next();
  };
};
