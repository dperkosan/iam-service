import { QueryFailedError } from 'typeorm';
import {
  isQueryFailedErrorWithCode,
  QueryFailedErrorWithCode,
} from '@common/errors/query-failed.error';

describe('Utility Function - isQueryFailedErrorWithCode', () => {
  describe('when the error is a QueryFailedError with a code property', () => {
    it('should return true', () => {
      // Arrange
      const driverError = new Error('Driver error');
      const error: QueryFailedErrorWithCode = Object.assign(
        new QueryFailedError('SELECT * FROM users', [], driverError),
        { code: '23505' },
      );

      // Act
      const result = isQueryFailedErrorWithCode(error);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('when the error is not an instance of QueryFailedError', () => {
    it('should return false for an object that is not an instance of QueryFailedError', () => {
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
      const driverError = new Error('Driver error');
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
      // Act & Assert
      expect(isQueryFailedErrorWithCode(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      // Act & Assert
      expect(isQueryFailedErrorWithCode(undefined)).toBe(false);
    });
  });

  describe('when the error is a non-object type', () => {
    it('should return false for a string', () => {
      // Act & Assert
      expect(isQueryFailedErrorWithCode('some string')).toBe(false);
    });

    it('should return false for a number', () => {
      // Act & Assert
      expect(isQueryFailedErrorWithCode(12345)).toBe(false);
    });
  });
});
