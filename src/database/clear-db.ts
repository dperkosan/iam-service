import { DataSource } from 'typeorm';

import { User } from '@user/entities/user.entity';

const clearDB = async (dataSource: DataSource) => {
  await dataSource.query(
    `TRUNCATE "${dataSource.getMetadata(User).tableName}" CASCADE;`,
  );
};

export default clearDB;