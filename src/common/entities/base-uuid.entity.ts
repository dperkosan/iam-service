import { Entity, PrimaryGeneratedColumn } from 'typeorm';

import { Base } from '@common/entities/base.entity';

@Entity({ synchronize: false })
export abstract class BaseUuid extends Base {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
}
