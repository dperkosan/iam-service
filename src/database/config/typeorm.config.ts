import 'dotenv/config';
import { SeederOptions } from 'typeorm-extension';
import { DataSource, DataSourceOptions } from 'typeorm';
import { NodeEnvAllowedValues } from '@common/types/node-env-allowed-values.type';
import getEnvVariable from '@common/utils/env.util';

const isProduction = getEnvVariable('NODE_ENV') === 'production';

// Base configuration shared across environments
const baseConfig: DataSourceOptions = {
  type: 'postgres',
  host: getEnvVariable('DB_HOST'),
  port: parseInt(getEnvVariable('DB_PORT') || '5432'),
  username: getEnvVariable('DB_USERNAME'),
  password: getEnvVariable('DB_PASSWORD'),
  synchronize: false, // Never use in production
  logging: false,
  entities: isProduction
    ? ['dist/**/*.entity.js'] // Production: compiled files
    : ['src/**/*.entity.ts'], // Development: TypeScript source files
  migrations: isProduction
    ? ['dist/database/migrations/*.js']
    : ['src/database/migrations/*.ts'],
};

// Environment-specific overrides
const environmentOverrides: Record<
  NodeEnvAllowedValues,
  DataSourceOptions & SeederOptions
> = {
  development: {
    ...baseConfig,
    database: getEnvVariable('DB_NAME'),
    factories: ['src/**/*.factory.ts'],
    seeds: ['src/database/seeds/*.ts'],
    logging: true,
  },
  test: {
    ...baseConfig,
    database: getEnvVariable('DB_NAME'),
    synchronize: true,
  },
  production: {
    ...baseConfig,
    url: getEnvVariable('DATABASE_URL'),
    ssl: { rejectUnauthorized: false }, // For platforms like Heroku
  },
};

// Merge base configuration with environment-specific options
const currentEnv =
  (getEnvVariable('NODE_ENV') as NodeEnvAllowedValues) || 'development';
const dataSourceOptions: DataSourceOptions & SeederOptions = {
  ...environmentOverrides[currentEnv],
};

// Initialize the DataSource
const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
