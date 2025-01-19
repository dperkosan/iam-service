import { MissingEnvError } from '@common/errors/http-status.error';
import getEnvVariable from '@common/utils/env.util';

describe('getEnvVariable', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('when the environment variable exists', () => {
    it('should return the value of an existing environment variable', () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'test-secret';

      const value = getEnvVariable('JWT_SECRET');

      expect(value).toBe('test-secret');
    });

    it('should not throw an error when the required variable is set', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgres://user:pass@localhost/db';

      expect(getEnvVariable('DATABASE_URL')).toBe(
        'postgres://user:pass@localhost/db',
      );
    });

    it('should return an empty string for non-required variables that are not set', () => {
      process.env.NODE_ENV = 'development';

      expect(getEnvVariable('SOME_NON_REQUIRED_VAR')).toBe('');
    });

    it('should not throw an error for non-required variables', () => {
      process.env.NODE_ENV = 'test';

      expect(getEnvVariable('NON_REQUIRED_VAR')).toBe('');
    });

    it('should default to "development" if NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;
      process.env.JWT_SECRET = 'test-secret';

      const value = getEnvVariable('JWT_SECRET');

      expect(value).toBe('test-secret');
    });
  });

  describe('when the environment variable is missing', () => {
    it('should throw MissingEnvError if a required variable is not set in "common"', () => {
      process.env.NODE_ENV = 'development';

      expect(() => getEnvVariable('JWT_SECRET')).toThrow(MissingEnvError);
      expect(() => getEnvVariable('JWT_SECRET')).toThrow(
        'Environment variable "JWT_SECRET" is missing or undefined',
      );
    });

    it('should throw MissingEnvError if a required variable is not set in the current environment', () => {
      process.env.NODE_ENV = 'test';

      expect(() => getEnvVariable('DB_HOST')).toThrow(MissingEnvError);
      expect(() => getEnvVariable('DB_HOST')).toThrow(
        'Environment variable "DB_HOST" is missing or undefined',
      );
    });

    it('should throw MissingEnvError for production-specific variables when NODE_ENV is "production"', () => {
      process.env.NODE_ENV = 'production';

      expect(() => getEnvVariable('DATABASE_URL')).toThrow(MissingEnvError);
      expect(() => getEnvVariable('DATABASE_URL')).toThrow(
        'Environment variable "DATABASE_URL" is missing or undefined',
      );
    });

    it('should handle a variable that is required in "common" but not set', () => {
      delete process.env.JWT_SECRET;

      expect(() => getEnvVariable('JWT_SECRET')).toThrow(MissingEnvError);
      expect(() => getEnvVariable('JWT_SECRET')).toThrow(
        'Environment variable "JWT_SECRET" is missing or undefined',
      );
    });

    it('should handle a variable that is required in the current environment but not set', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.DB_HOST;

      expect(() => getEnvVariable('DB_HOST')).toThrow(MissingEnvError);
      expect(() => getEnvVariable('DB_HOST')).toThrow(
        'Environment variable "DB_HOST" is missing or undefined',
      );
    });

    it('should handle a variable that is not required and not set', () => {
      delete process.env.NON_REQUIRED_VAR;

      const value = getEnvVariable('NON_REQUIRED_VAR');

      expect(value).toBe('');
    });
  });
});
