import { genSalt, hash } from 'bcrypt';
import { setSeederFactory } from 'typeorm-extension';

import { Role } from '@modules/iam/enums/role.enum';
import { User } from '@modules/iam/entities/user.entity';

export default setSeederFactory(User, async (faker) => {
  const user = new User();

  user.firstName = faker.person.firstName();
  user.lastName = faker.person.lastName();
  user.email = faker.internet.email();
  user.password = await hash('password', await genSalt());
  user.role = faker.helpers.enumValue(Role);
  user.emailVerified = true;

  return user;
});
