import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

import { User } from '@modules/iam/entities/user.entity';
import { Role } from '@modules/iam/enums/role.enum';
import clearDB from '@database/clear-db';

export default class Seed implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<void> {
    // clear DB first
    await clearDB(dataSource);

    // seed DB
    const userFactory = factoryManager.get(User);

    // regular users
    await userFactory.saveMany(10, { role: Role.USER });
    // admins
    await userFactory.saveMany(10, { role: Role.ADMIN });
    // email not verified users
    await userFactory.saveMany(3, { role: Role.USER, emailVerified: false });
    // email not verified admins
    await userFactory.saveMany(3, {
      role: Role.ADMIN,
      emailVerified: false,
    });
    // disabled users
    await userFactory.saveMany(3, { role: Role.USER, enabled: false });
    // disabled admins
    await userFactory.saveMany(3, { role: Role.ADMIN, enabled: false });
  }
}
