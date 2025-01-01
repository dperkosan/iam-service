import Joi from 'joi';
import { Role } from '@modules/iam/enums/role.enum';

export const registerSchema = Joi.object({
  firstName: Joi.string().trim().required(),
  lastName: Joi.string().trim().required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string()
    .valid(...Object.values(Role))
    .required(),
}).required();
