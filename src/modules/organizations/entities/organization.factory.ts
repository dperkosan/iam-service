import { faker } from '@faker-js/faker';
import { setSeederFactory } from 'typeorm-extension';
import { Organization } from '@modules/organizations/entities/organization.entity';

export default setSeederFactory(Organization, async () => {
  const organization = new Organization();

  organization.name = faker.company.name();

  return organization;
});
