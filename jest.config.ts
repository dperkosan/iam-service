import { pathsToModuleNameMapper } from 'ts-jest';
import { compilerOptions } from './tsconfig.json';

export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {}],
  },
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/',
  }),
  modulePaths: [compilerOptions.baseUrl],
  collectCoverage: true, // Enable coverage collection
  coverageDirectory: 'coverage', // Directory to output coverage reports
  coverageReporters: ['text', 'lcov'], // Output format for coverage reports
  coverageThreshold: {
    // Enforce 100% coverage
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  coveragePathIgnorePatterns: [
    // Ignore specific files or directories
    '/node_modules/',
    '/dist/',
    'jest.config.ts',
    '/src/common/log/app.log.ts',
    '/src/database/config/typeorm.config.ts',
  ],
};
