import { RegisterDto } from '@modules/iam/dtos/register.dto';
import * as userRepository from '@modules/iam/repositories/user.repository';
import { AppError } from '@common/errors/http-status.error';
import logger from '@common/log/app.log';

export const register = async (registerDto: RegisterDto) => {
  try {
    const userToCreate = { ...registerDto };
    return await userRepository.createUser(userToCreate);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 400) {
      logger.warn('Validation or Conflict Error:', error.message);
      throw error;
    }

    logger.error('Unexpected Service Error:', error);
    throw new AppError('Service Error: Failed to register user', 500);
  }
};
