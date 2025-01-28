import { randomUUID } from 'crypto';

import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

import { User } from '@modules/iam/entities/user.entity';
import { Organization } from '@modules/organizations/entities/organization.entity';
import { Role } from '@modules/iam/enums/role.enum';
import { organizationMockFactory } from '@modules/organizations/mocks/organization.mock';

interface UserMockFactoryProps {
  email?: string;
  password?: string;
  role?: Role;
  emailVerified?: boolean;
  enabled?: boolean;
  organization?: Organization;
}

const userMockFactory = (options?: UserMockFactoryProps) => {
  const user = new User();
  const organization = options?.organization || organizationMockFactory();

  user.id = randomUUID();
  user.firstName = faker.person.firstName();
  user.lastName = faker.person.lastName();
  user.email = options?.email || faker.internet.email();
  user.password = bcrypt.hashSync(
    options?.password || faker.internet.password(),
    10,
  );
  user.role = options?.role || faker.helpers.enumValue(Role);
  user.emailVerified =
    typeof options?.emailVerified === 'undefined'
      ? true
      : options.emailVerified;
  user.enabled =
    typeof options?.enabled === 'undefined' ? true : options.enabled;
  user.organization = organization;
  user.organizationId = organization.id;
  user.createdAt = faker.date.past();
  user.updatedAt = faker.date.past();

  return user;
};

const usersMock = [...Array(faker.number.int({ min: 2, max: 5 })).keys()].map(
  () => userMockFactory(),
);

const userMock = usersMock[0];

export { userMock, usersMock, userMockFactory };
