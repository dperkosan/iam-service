import { Request, Response } from 'express';
import { RegisterDto } from '@modules/iam/dtos/register.dto';
import * as authService from '@modules/iam/services/auth.service';
import { ResendEmailWithTokenDto } from '@modules/iam/dtos/resend-email-with-token.dto';

export const register = async (req: Request, res: Response): Promise<void> => {
  const registerDto: RegisterDto = req.body;
  const result = await authService.register(registerDto);

  res.status(201).json(result);
};

/**
 * User is sending an old token to ask API to resend an email
 */
export const resendVerifyAccountEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const resendEmailWithTokenDto: ResendEmailWithTokenDto = req.body;
  const result = await authService.resendVerifyAccountEmail(
    resendEmailWithTokenDto,
  );

  res.status(200).json(result);
};
