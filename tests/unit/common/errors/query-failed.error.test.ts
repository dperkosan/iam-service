import { QueryFailedError } from 'typeorm';
import {
  isQueryFailedErrorWithCode,
  QueryFailedErrorWithCode,
} from '@common/errors/query-failed.error';

describe('Utility Function - isQueryFailedErrorWithCode', () => {
  const driverError = new Error('Driver error');

  describe('when the error is a QueryFailedError with a code property', () => {
    it('should return true', () => {
      // Arrange
      const error: QueryFailedErrorWithCode = Object.assign(
        new QueryFailedError('SELECT * FROM users', [], driverError),
        { code: '23505' },
      );

      // Act
      const result = isQueryFailedErrorWithCode(error);

      // Assert
      expect(result).toBe(true);
      expect((error as QueryFailedErrorWithCode).code).toBe('23505');
    });
  });

  describe('when the error is not an instance of QueryFailedError', () => {
    it('should return false for an object with a code property', () => {
      // Arrange
      const error = {
        code: '23505',
        message: 'Some error',
      };

      // Act
      const result = isQueryFailedErrorWithCode(error);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('when the error is a QueryFailedError without a code property', () => {
    it('should return false', () => {
      // Arrange
      const error = new QueryFailedError(
        'SELECT * FROM users',
        [],
        driverError,
      );

      // Act
      const result = isQueryFailedErrorWithCode(error);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('when the error is null or undefined', () => {
    it('should return false for null', () => {
      // Act
      const result = isQueryFailedErrorWithCode(null);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for undefined', () => {
      // Act
      const result = isQueryFailedErrorWithCode(undefined);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('when the error is a non-object type (e.g., string, number)', () => {
    it('should return false for a string', () => {
      // Act
      const result = isQueryFailedErrorWithCode('some string');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for a number', () => {
      // Act
      const result = isQueryFailedErrorWithCode(12345);

      // Assert
      expect(result).toBe(false);
    });
  });
});
