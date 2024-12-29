import { Column, Entity, Unique } from 'typeorm';

import { BaseUuid } from '@common/entities/base-uuid.entity';
import { Role } from '@user/enums/role.enum';

@Entity()
@Unique(['email', 'role'])
export class User extends BaseUuid {
  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column()
  email!: string;

  @Column()
  password!: string;

  @Column({
    type: 'enum',
    enum: Role,
  })
  role!: Role;

  @Column({
    default: false,
  })
  emailVerified!: boolean;

  @Column({
    default: true,
  })
  enabled!: boolean;
}
