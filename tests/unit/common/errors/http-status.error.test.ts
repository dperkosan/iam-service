import {
  AppError,
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  MissingEnvError,
} from '@common/errors/http-status.error';

function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

describe('Error Classes', () => {
  describe('when working with AppError', () => {
    it('should set message, statusCode, and isOperational correctly', () => {
      const error = new AppError('Test error', 500, false);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(false);
      expect(error).toBeInstanceOf(AppError);
    });

    it('should default isOperational to true if not provided', () => {
      const error = new AppError('Test error', 500);
      expect(error.isOperational).toBe(true);
    });

    it('should capture the stack trace', () => {
      const error = new AppError('Test error', 500);
      expect(error.stack).toContain('AppError');
    });

    it('should throw and be caught as an AppError', () => {
      try {
        throw new AppError('Test error', 500);
      } catch (caughtError) {
        if (isAppError(caughtError)) {
          expect(caughtError.message).toBe('Test error');
          expect(caughtError.statusCode).toBe(500);
        } else {
          throw new Error('Unexpected error type');
        }
      }
    });
  });

  const errorClasses = [
    {
      name: 'BadRequestError',
      class: BadRequestError,
      defaultMessage: 'Bad Request',
      defaultCode: 400,
    },
    {
      name: 'NotFoundError',
      class: NotFoundError,
      defaultMessage: 'Not Found',
      defaultCode: 404,
    },
    {
      name: 'UnauthorizedError',
      class: UnauthorizedError,
      defaultMessage: 'Unauthorized',
      defaultCode: 401,
    },
    {
      name: 'ForbiddenError',
      class: ForbiddenError,
      defaultMessage: 'Forbidden',
      defaultCode: 403,
    },
  ];

  errorClasses.forEach(
    ({ name, class: ErrorClass, defaultMessage, defaultCode }) => {
      describe(`when working with ${name}`, () => {
        it(`should have a default message "${defaultMessage}" and status code ${defaultCode}`, () => {
          const error = new ErrorClass();
          expect(error.message).toBe(defaultMessage);
          expect(error.statusCode).toBe(defaultCode);
          expect(error.isOperational).toBe(true);
          expect(error).toBeInstanceOf(ErrorClass);
          expect(error).toBeInstanceOf(AppError);
        });

        it('should allow a custom message', () => {
          const error = new ErrorClass('Custom message');
          expect(error.message).toBe('Custom message');
        });

        it(`should throw and be caught as a ${name}`, () => {
          try {
            throw new ErrorClass();
          } catch (caughtError) {
            if (isAppError(caughtError)) {
              expect(caughtError).toBeInstanceOf(ErrorClass);
              expect(caughtError.message).toBe(defaultMessage);
            } else {
              throw new Error('Unexpected error type');
            }
          }
        });
      });
    },
  );

  describe('when working with ValidationError', () => {
    it('should concatenate errors into the message and have status code 400', () => {
      const errors = ['Field A is required', 'Field B must be a number'];
      const error = new ValidationError(errors);
      expect(error.message).toBe(
        'Validation Error: Field A is required, Field B must be a number',
      );
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toBeInstanceOf(AppError);
    });

    it('should handle an empty error array gracefully', () => {
      const errors: string[] = [];
      const error = new ValidationError(errors);
      expect(error.message).toBe('Validation Error: ');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('when working with MissingEnvError', () => {
    it('should include the variable name in the message and have status code 500', () => {
      const variableName = 'API_KEY';
      const error = new MissingEnvError(variableName);
      expect(error.message).toBe(
        `Environment variable "${variableName}" is missing or undefined`,
      );
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error).toBeInstanceOf(MissingEnvError);
      expect(error).toBeInstanceOf(AppError);
    });

    it('should handle an empty variable name gracefully', () => {
      const variableName = '';
      const error = new MissingEnvError(variableName);
      expect(error.message).toBe(
        'Environment variable "" is missing or undefined',
      );
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });

    it('should throw and be caught as a MissingEnvError', () => {
      try {
        throw new MissingEnvError('API_KEY');
      } catch (caughtError) {
        if (isAppError(caughtError)) {
          expect(caughtError).toBeInstanceOf(MissingEnvError);
          expect(caughtError.message).toBe(
            'Environment variable "API_KEY" is missing or undefined',
          );
        } else {
          throw new Error('Unexpected error type');
        }
      }
    });
  });
});
