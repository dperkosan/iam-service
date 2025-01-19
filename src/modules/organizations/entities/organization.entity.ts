import { Column, Entity, OneToMany } from 'typeorm';

import { BaseUuid } from '@common/entities/base-uuid.entity';
import { User } from '@modules/iam/entities/user.entity';

@Entity()
export class Organization extends BaseUuid {
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @OneToMany(() => User, (user) => user.organization)
  users!: User[];
}
