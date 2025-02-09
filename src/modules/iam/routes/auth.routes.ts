import { Router } from 'express';
import { RegisterDto } from '@modules/iam/dtos/register.dto';
import { validation } from '@middleware/validation.middleware';
import {
  register,
  resendVerifyAccountEmail,
} from '@modules/iam/controllers/auth.controller';
import { handleRouteErrors } from '@middleware/error.middleware';
import { ResendEmailWithTokenDto } from '@modules/iam/dtos/resend-email-with-token.dto';

const router = Router();

router.post('/register', validation(RegisterDto), handleRouteErrors(register));
router.post(
  '/resend-verify-account-email',
  validation(ResendEmailWithTokenDto),
  handleRouteErrors(resendVerifyAccountEmail),
);

export default router;
