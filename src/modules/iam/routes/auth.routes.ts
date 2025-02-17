import { Router } from 'express';
import { RegisterDto } from '@modules/iam/dtos/register.dto';
import { validation } from '@middleware/validation.middleware';
import {
  login,
  refreshToken,
  register,
  resendVerifyAccountEmail,
  sendVerifyAccountEmail,
  verifyAccount,
} from '@modules/iam/controllers/auth.controller';
import { handleRouteErrors } from '@middleware/error.middleware';
import { ResendEmailWithTokenDto } from '@modules/iam/dtos/resend-email-with-token.dto';
import { SendEmailDto } from '@modules/iam/dtos/send-email.dto';
import { VerifyAccountDto } from '@modules/iam/dtos/verify-account.dto';
import { LoginDto } from '@modules/iam/dtos/login.dto';
import { RefreshTokenDto } from '@modules/iam/dtos/refresh-token.dto';

const router = Router();

router.post('/register', validation(RegisterDto), handleRouteErrors(register));

router.post(
  '/resend-verify-account-email',
  validation(ResendEmailWithTokenDto),
  handleRouteErrors(resendVerifyAccountEmail),
);

router.post(
  '/send-verify-account-email',
  validation(SendEmailDto),
  handleRouteErrors(sendVerifyAccountEmail),
);

router.patch(
  '/verify-account',
  validation(VerifyAccountDto),
  handleRouteErrors(verifyAccount),
);

router.post('/login', validation(LoginDto), handleRouteErrors(login));

router.post(
  '/refresh-token',
  validation(RefreshTokenDto),
  handleRouteErrors(refreshToken),
);

export default router;
