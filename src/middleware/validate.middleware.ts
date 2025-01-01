import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ObjectSchema } from 'joi';

export const validate = (schema: ObjectSchema): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      res.status(400).json({
        errors: error.details.map((detail) => detail.message),
      });
    } else {
      req.body = value;
      next();
    }
  };
};
