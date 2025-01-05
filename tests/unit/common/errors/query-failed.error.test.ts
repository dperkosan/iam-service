import { QueryFailedError } from 'typeorm';
import {
  isQueryFailedErrorWithCode,
  QueryFailedErrorWithCode,
} from '@common/errors/query-failed.error';

describe('Utility Function - isQueryFailedErrorWithCode', () => {
  it('should return true for a QueryFailedError with a code property', () => {
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

  it('should return false for a QueryFailedError without a code property', () => {
    // Arrange
    const driverError = new Error('Driver error');
    const error = new QueryFailedError('SELECT * FROM users', [], driverError);

    // Act
    const result = isQueryFailedErrorWithCode(error);

    // Assert
    expect(result).toBe(false);
  });

  it('should return false for null or undefined', () => {
    // Act & Assert
    expect(isQueryFailedErrorWithCode(null)).toBe(false);
    expect(isQueryFailedErrorWithCode(undefined)).toBe(false);
  });

  it('should return false for a non-object type (e.g., string or number)', () => {
    // Act & Assert
    expect(isQueryFailedErrorWithCode('some string')).toBe(false);
    expect(isQueryFailedErrorWithCode(12345)).toBe(false);
  });
});
