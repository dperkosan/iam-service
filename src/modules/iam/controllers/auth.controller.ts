import { Request, Response, NextFunction } from 'express';
import { RegisterDto } from '@modules/iam/dtos/register.dto';
import * as authService from '@modules/iam/services/auth.service';

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const registerDto: RegisterDto = req.body;
    const result = await authService.register(registerDto);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};
