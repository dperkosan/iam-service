import dataSource from '@database/config/typeorm.config';
import { User } from '@modules/iam/entities/user.entity';
import { isQueryFailedErrorWithCode } from '@common/errors/query-failed.error';
import { BadRequestError } from '@common/errors/http-status.error';
import logger from '@common/log/app.log';

export const createUser = async (user: Partial<User>): Promise<User> => {
  try {
    const userRepository = dataSource.getRepository(User);
    const newUser = userRepository.create(user);
    return await userRepository.save(newUser);
  } catch (error) {
    logger.error('Repository Error:', error);
    if (isQueryFailedErrorWithCode(error) && error.code === '23505') {
      throw new BadRequestError('Email already exists');
    }
    throw error;
  }
};
