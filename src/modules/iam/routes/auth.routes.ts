import { Router } from 'express';
import { registerSchema } from '@modules/iam/validations/register.validation';
import { validate } from '@middleware/validate.middleware';
import { register } from '@modules/iam/controllers/auth.controller';

const router = Router();

router.post('/register', validate(registerSchema), register);

export default router;
