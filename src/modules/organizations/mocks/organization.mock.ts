import { faker } from '@faker-js/faker';
import { Organization } from '@modules/organizations/entities/organization.entity';
import { randomUUID } from 'crypto';

const organizationMockFactory = () => {
  const organization = new Organization();

  organization.id = randomUUID();
  organization.name = faker.company.name();
  organization.createdAt = faker.date.past();
  organization.updatedAt = faker.date.past();

  return organization;
};

const organizationsMock = [
  ...Array(faker.number.int({ min: 2, max: 5 })).keys(),
].map(() => organizationMockFactory());

const organizationMock = organizationsMock[0];

export { organizationMock, organizationsMock, organizationMockFactory };
