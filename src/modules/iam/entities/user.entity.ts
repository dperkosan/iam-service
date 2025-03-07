import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseUuid } from '@common/entities/base-uuid.entity';
import { Role } from '@modules/iam/enums/role.enum';
import { Organization } from '@modules/organizations/entities/organization.entity';

@Entity()
@Index(['email', 'organizationId'], { unique: true })
export class User extends BaseUuid {
  @Column({ type: 'varchar', length: 255 })
  firstName!: string;

  @Column({ type: 'varchar', length: 255 })
  lastName!: string;

  @Column({ type: 'varchar', length: 255 })
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

  @ManyToOne(() => Organization, (organization) => organization.users, {
    nullable: false,
  })
  @JoinColumn({ name: 'organizationId' })
  organization!: Organization;

  @Column({ type: 'uuid' })
  organizationId!: Organization['id'];
}
