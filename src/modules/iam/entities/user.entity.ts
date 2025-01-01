import { Column, Entity } from 'typeorm';

import { BaseUuid } from '@common/entities/base-uuid.entity';
import { Role } from '@modules/iam/enums/role.enum';

@Entity()
export class User extends BaseUuid {
  @Column({ type: 'varchar', length: 255 })
  firstName!: string;

  @Column({ type: 'varchar', length: 255 })
  lastName!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  password!: string;

  @Column({
    type: 'enum',
    enum: Role,
  })
  role!: Role;

  @Column({
    type: 'boolean',
    default: false,
  })
  emailVerified!: boolean;

  @Column({
    type: 'boolean',
    default: true,
  })
  enabled!: boolean;
}
