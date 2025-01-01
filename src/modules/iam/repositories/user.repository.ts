import dataSource from '@database/config/typeorm.config';
import { User } from '@modules/iam/entities/user.entity';

export const createUser = async (user: Partial<User>): Promise<User> => {
  const userRepository = dataSource.getRepository(User);

  const newUser = userRepository.create(user);
  return await userRepository.save(newUser);
};
