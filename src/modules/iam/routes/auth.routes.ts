import { Router } from 'express';
import { RegisterDto } from '@modules/iam/dtos/register.dto';
import { validation } from '@middleware/validation.middleware';
import { register } from '@modules/iam/controllers/auth.controller';
import { handleRouteErrors } from '@middleware/error.middleware';

const router = Router();

router.post('/register', validation(RegisterDto), handleRouteErrors(register));

export default router;
