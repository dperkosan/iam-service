import {
  AppError,
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  MissingEnvError,
} from '@common/errors/http-status.error';

describe('Error Classes', () => {
  describe('AppError', () => {
    describe('when initializing AppError', () => {
      it('should set message, statusCode, and isOperational', () => {
        const error = new AppError('Test error', 500, false);

        expect(error.message).toBe('Test error');
        expect(error.statusCode).toBe(500);
        expect(error.isOperational).toBe(false);
        expect(error).toBeInstanceOf(AppError);
      });

      it('should set isOperational to true by default', () => {
        const error = new AppError('Test error', 500);

        expect(error.isOperational).toBe(true);
      });
    });
  });

  describe('BadRequestError', () => {
    describe('when using default settings', () => {
      it('should have a default message and status code 400', () => {
        const error = new BadRequestError();

        expect(error.message).toBe('Bad Request');
        expect(error.statusCode).toBe(400);
        expect(error.isOperational).toBe(true);
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error).toBeInstanceOf(AppError);
      });
    });

    describe('when providing a custom message', () => {
      it('should allow a custom message', () => {
        const error = new BadRequestError('Custom message');

        expect(error.message).toBe('Custom message');
      });
    });
  });

  describe('NotFoundError', () => {
    describe('when using default settings', () => {
      it('should have a default message and status code 404', () => {
        const error = new NotFoundError();

        expect(error.message).toBe('Not Found');
        expect(error.statusCode).toBe(404);
        expect(error.isOperational).toBe(true);
        expect(error).toBeInstanceOf(NotFoundError);
        expect(error).toBeInstanceOf(AppError);
      });
    });

    describe('when providing a custom message', () => {
      it('should allow a custom message', () => {
        const error = new NotFoundError('Custom message');

        expect(error.message).toBe('Custom message');
      });
    });
  });

  describe('UnauthorizedError', () => {
    describe('when using default settings', () => {
      it('should have a default message and status code 401', () => {
        const error = new UnauthorizedError();

        expect(error.message).toBe('Unauthorized');
        expect(error.statusCode).toBe(401);
        expect(error.isOperational).toBe(true);
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect(error).toBeInstanceOf(AppError);
      });
    });

    describe('when providing a custom message', () => {
      it('should allow a custom message', () => {
        const error = new UnauthorizedError('Custom message');

        expect(error.message).toBe('Custom message');
      });
    });
  });

  describe('ForbiddenError', () => {
    describe('when using default settings', () => {
      it('should have a default message and status code 403', () => {
        const error = new ForbiddenError();

        expect(error.message).toBe('Forbidden');
        expect(error.statusCode).toBe(403);
        expect(error.isOperational).toBe(true);
        expect(error).toBeInstanceOf(ForbiddenError);
        expect(error).toBeInstanceOf(AppError);
      });
    });

    describe('when providing a custom message', () => {
      it('should allow a custom message', () => {
        const error = new ForbiddenError('Custom message');

        expect(error.message).toBe('Custom message');
      });
    });
  });

  describe('ValidationError', () => {
    describe('when initialized with multiple errors', () => {
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
    });

    describe('when initialized with an empty error array', () => {
      it('should handle an empty error array gracefully', () => {
        const errors: string[] = [];
        const error = new ValidationError(errors);

        expect(error.message).toBe('Validation Error: ');
        expect(error.statusCode).toBe(400);
        expect(error.isOperational).toBe(true);
      });
    });
  });

  describe('MissingEnvError', () => {
    describe('when the variable name is provided', () => {
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
    });

    describe('when the variable name is empty', () => {
      it('should handle an empty variable name gracefully', () => {
        const variableName = '';
        const error = new MissingEnvError(variableName);

        expect(error.message).toBe(
          'Environment variable "" is missing or undefined',
        );
        expect(error.statusCode).toBe(500);
        expect(error.isOperational).toBe(true);
        expect(error).toBeInstanceOf(MissingEnvError);
        expect(error).toBeInstanceOf(AppError);
      });
    });
  });
});
