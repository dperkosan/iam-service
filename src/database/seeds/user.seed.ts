import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

import { User } from '@modules/iam/entities/user.entity';
import { Role } from '@modules/iam/enums/role.enum';
import clearDB from '@database/clear-db';
import { Organization } from '@modules/organizations/entities/organization.entity';

export default class UserSeed implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<void> {
    // clear DB first
    await clearDB(dataSource);

    // seed DB
    const organizationFactory = factoryManager.get(Organization);
    const userFactory = factoryManager.get(User);

    const organizations = await organizationFactory.saveMany(3);

    // For each organization, create users with the specified roles and properties
    for (const organization of organizations) {
      // regular users
      await userFactory.saveMany(10, {
        role: Role.USER,
        organization: organization,
      });
      // admins
      await userFactory.saveMany(10, {
        role: Role.ADMIN,
        organization: organization,
      });
      // email not verified users
      await userFactory.saveMany(3, {
        role: Role.USER,
        emailVerified: false,
        organization: organization,
      });
      // email not verified admins
      await userFactory.saveMany(3, {
        role: Role.ADMIN,
        emailVerified: false,
        organization: organization,
      });
      // disabled users
      await userFactory.saveMany(3, {
        role: Role.USER,
        enabled: false,
        organization: organization,
      });
      // disabled admins
      await userFactory.saveMany(3, {
        role: Role.ADMIN,
        enabled: false,
        organization: organization,
      });
    }
  }
}
