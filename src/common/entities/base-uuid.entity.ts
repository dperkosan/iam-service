import { Entity, PrimaryGeneratedColumn } from 'typeorm';

import { Base } from '@common/entities/base.entity';
import getEnvVariable from '@common/utils/env.util';

@Entity({ schema: getEnvVariable('DB_SCHEMA') || 'public', synchronize: false })
export abstract class BaseUuid extends Base {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
}
