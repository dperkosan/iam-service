import 'dotenv/config';
import { SeederOptions } from 'typeorm-extension';
import { DataSource, DataSourceOptions } from 'typeorm';
import { NodeEnvAllowedValues } from '@common/types/node-env-allowed-values.type';

// Base configuration shared across environments
const baseConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  synchronize: false, // Never use in production
  logging: false,
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/database/migrations/*.js'],
};

// Environment-specific overrides
const environmentOverrides: Record<
  NodeEnvAllowedValues,
  DataSourceOptions & SeederOptions
> = {
  development: {
    ...baseConfig,
    database: process.env.DB_NAME,
    factories: ['dist/**/*.factory.js'],
    seeds: ['dist/database/seeds/*{.ts,.js}'],
    logging: true,
  },
  test: {
    ...baseConfig,
    database: process.env.DB_NAME_TEST,
    entities: ['src/**/*.entity.ts'],
    migrations: ['src/database/migrations/*.ts'],
    synchronize: true,
  },
  production: {
    ...baseConfig,
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // For platforms like Heroku
  },
};

// Merge base configuration with environment-specific options
const currentEnv =
  (process.env.NODE_ENV as NodeEnvAllowedValues) || 'development';
const dataSourceOptions: DataSourceOptions & SeederOptions = {
  ...environmentOverrides[currentEnv],
};

// Initialize the DataSource
const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
