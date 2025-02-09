import dataSource from '@database/config/typeorm.config';
import { User } from '@modules/iam/entities/user.entity';
import { Repository } from 'typeorm';

class UserRepository extends Repository<User> {}

export const userRepository = dataSource
  .getRepository(User)
  .extend(UserRepository) as unknown as UserRepository;
