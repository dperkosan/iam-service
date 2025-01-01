import { Router } from 'express';
import { RegisterDto } from '@modules/iam/dtos/register.dto';
import { validation } from '@middleware/validation.middleware';
import { register } from '@modules/iam/controllers/auth.controller';

const router = Router();

router.post('/register', validation(RegisterDto), register);

export default router;
