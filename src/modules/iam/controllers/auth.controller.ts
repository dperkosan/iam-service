import { Request, Response } from 'express';
import { RegisterDto } from '@modules/iam/dtos/register.dto';
import * as authService from '@modules/iam/services/auth.service';
import { ResendEmailWithTokenDto } from '@modules/iam/dtos/resend-email-with-token.dto';
import { SendEmailDto } from '@modules/iam/dtos/send-email.dto';
import { VerifyAccountDto } from '@modules/iam/dtos/verify-account.dto';
import { LoginDto } from '@modules/iam/dtos/login.dto';

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

/**
 * The user is providing their email address and organization ID
 * to the API to request an email be sent
 */
export const sendVerifyAccountEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const sendEmailDto: SendEmailDto = req.body;
  const result = await authService.sendVerifyAccountEmail(sendEmailDto);

  res.status(200).json(result);
};

export const verifyAccount = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const verifyAccountDto: VerifyAccountDto = req.body;
  const result = await authService.verifyAccount(verifyAccountDto);

  res.status(200).json(result);
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const loginDto: LoginDto = req.body;
  const result = await authService.login(loginDto);

  res.status(200).json(result);
};
