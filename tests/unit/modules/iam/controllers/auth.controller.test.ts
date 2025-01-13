import { Request, Response } from 'express';
import { register } from '@modules/iam/controllers/auth.controller';
import * as authService from '@modules/iam/services/auth.service';
import { AppError } from '@common/errors/http-status.error';
import { redisClient } from '@redis/redis.client'; // Adjust the import based on your setup

// Mock authService
jest.mock('@modules/iam/services/auth.service');

// Mock Redis
jest.mock('@common/redis/redis.client', () => {
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
    req = {
      body: { email: 'test@example.com', password: 'password123' }, // Example DTO
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

  it('should respond with 201 and the result from authService.register', async () => {
    // Arrange
    const mockResult = { id: 1, email: 'test@example.com' };
    (authService.register as jest.Mock).mockResolvedValue(mockResult);

    // Act
    await register(req as Request, res as Response);

    // Assert
    expect(authService.register).toHaveBeenCalledWith(req.body);
    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith(mockResult);
    expect(mockRedisClient.quit).not.toHaveBeenCalled(); // Redis quit should not be called by the controller
  });

  it('should handle validation errors from the service layer', async () => {
    const mockError = new AppError('Validation Error', 400);
    (authService.register as jest.Mock).mockRejectedValue(mockError);

    req.body = { email: 'invalid-email' };

    try {
      await register(req as Request, res as Response);
    } catch {
      expect(authService.register).toHaveBeenCalledWith(req.body);
      expect(statusMock).not.toHaveBeenCalled(); // Controller passes errors to `handleRouteErrors`
    }
  });

  it('should handle unexpected errors from the service layer', async () => {
    const mockError = new AppError(
      'Service Error: Failed to register user',
      500,
    );
    (authService.register as jest.Mock).mockRejectedValue(mockError);

    req.body = { email: 'test@example.com', password: 'password123' };

    try {
      await register(req as Request, res as Response);
    } catch {
      expect(authService.register).toHaveBeenCalledWith(req.body);
      expect(statusMock).not.toHaveBeenCalled(); // Errors should propagate
    }
  });

  it('should close Redis connection after the service call if required', async () => {
    const mockResult = { id: 1, email: 'test@example.com' };
    (authService.register as jest.Mock).mockResolvedValue(mockResult);

    // Act
    await register(req as Request, res as Response);

    // Assert
    expect(mockRedisClient.quit).not.toHaveBeenCalled(); // Singleton Redis is not closed in the controller
  });
});
