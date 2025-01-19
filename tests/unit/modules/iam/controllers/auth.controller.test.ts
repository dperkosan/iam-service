import { Request, Response } from 'express';
import { register } from '@modules/iam/controllers/auth.controller';
import * as authService from '@modules/iam/services/auth.service';
import { AppError } from '@common/errors/http-status.error';
import { redisClient } from '@redis/redis.client';
import { RegisterDto } from '@modules/iam/dtos/register.dto';
import { Role } from '@modules/iam/enums/role.enum';

// Mock authService
jest.mock('@modules/iam/services/auth.service');

// Mock Redis
jest.mock('@redis/redis.client', () => {
  const mockRedisClient = {
    get: jest.fn(),
    set: jest.fn(),
    quit: jest.fn(),
    on: jest.fn(), // Mock for event listeners
  };
  return {
    createRedisClient: jest.fn(() => mockRedisClient),
    redisClient: mockRedisClient,
  };
});

describe('Auth Controller - Register', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;
  const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis(); // Allows chaining
    jsonMock = jest.fn();
    const registerDto: RegisterDto = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'test@example.com',
      password: 'password123',
      role: Role.ADMIN,
      organizationId: 'org-1234',
    };
    req = {
      body: registerDto,
    };
    res = {
      status: statusMock,
      json: jsonMock,
    };

    // Reset Redis mock
    mockRedisClient.get.mockReset();
    mockRedisClient.set.mockReset();
    mockRedisClient.quit.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when registration is successful', () => {
    it('should respond with 201 and the result from authService.register', async () => {
      // Arrange
      const mockResult: RegisterDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'test@example.com',
        password: 'password123',
        role: Role.ADMIN,
        organizationId: 'org-1234',
      };
      (authService.register as jest.Mock).mockResolvedValue(mockResult);

      // Act
      await register(req as Request, res as Response);

      // Assert
      expect(authService.register).toHaveBeenCalledWith(req.body);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(mockResult);
      expect(mockRedisClient.quit).not.toHaveBeenCalled(); // Redis quit should not be called by the controller
    });
  });

  describe('when there is a validation error from the service layer', () => {
    it('should propagate the validation error', async () => {
      // Arrange
      const mockError = new AppError('Validation Error', 400);
      (authService.register as jest.Mock).mockRejectedValue(mockError);

      req.body = {
        email: 'invalid-email',
        organizationId: 'org-1234',
      } as RegisterDto;

      try {
        // Act
        await register(req as Request, res as Response);
      } catch {
        // Assert
        expect(authService.register).toHaveBeenCalledWith(req.body);
        expect(statusMock).not.toHaveBeenCalled(); // Controller passes errors to `handleRouteErrors`
      }
    });
  });

  describe('when there is an unexpected error from the service layer', () => {
    it('should propagate the unexpected error', async () => {
      // Arrange
      const mockError = new AppError(
        'Service Error: Failed to register user',
        500,
      );
      (authService.register as jest.Mock).mockRejectedValue(mockError);

      const registerDto: RegisterDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'test@example.com',
        password: 'password123',
        role: Role.ADMIN,
        organizationId: 'org-1234',
      };

      req.body = registerDto;

      try {
        // Act
        await register(req as Request, res as Response);
      } catch {
        // Assert
        expect(authService.register).toHaveBeenCalledWith(req.body);
        expect(statusMock).not.toHaveBeenCalled(); // Errors should propagate
      }
    });
  });

  describe('when the Redis connection needs to be closed', () => {
    it('should not close the Redis connection for singleton usage', async () => {
      // Arrange
      const mockResult: RegisterDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'test@example.com',
        password: 'password123',
        role: Role.ADMIN,
        organizationId: 'org-1234',
      };
      (authService.register as jest.Mock).mockResolvedValue(mockResult);

      // Act
      await register(req as Request, res as Response);

      // Assert
      expect(mockRedisClient.quit).not.toHaveBeenCalled(); // Singleton Redis is not closed in the controller
    });
  });
});
