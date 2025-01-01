// src/modules/auth/dtos/register.dto.ts
import { Role } from '@modules/iam/enums/role.enum';

export interface RegisterDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: Role;
}
