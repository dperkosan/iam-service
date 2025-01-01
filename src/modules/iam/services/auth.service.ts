// src/modules/auth/services/auth.service.ts
import { RegisterDto } from '@modules/iam/dtos/register.dto';
import * as userRepository from '@modules/iam/repositories/user.repository';

export const register = async (registerDto: RegisterDto) => {
  const userToCreate = { ...registerDto };
  return await userRepository.createUser(userToCreate);
};
