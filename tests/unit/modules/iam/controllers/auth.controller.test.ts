import { Request, Response } from 'express';
import {
  login,
  refreshToken,
  register,
  resendVerifyAccountEmail,
  sendVerifyAccountEmail,
  verifyAccount,
} from '@modules/iam/controllers/auth.controller';
import * as authService from '@modules/iam/services/auth.service';
import { AppError } from '@common/errors/http-status.error';
import { redisClient } from '@redis/redis.client';
import { RegisterDto } from '@modules/iam/dtos/register.dto';
import { Role } from '@modules/iam/enums/role.enum';
import { ResendEmailWithTokenDto } from '@modules/iam/dtos/resend-email-with-token.dto';
import { SendEmailDto } from '@modules/iam/dtos/send-email.dto';
import { VerifyAccountDto } from '@modules/iam/dtos/verify-account.dto';
import { LoginDto } from '@modules/iam/dtos/login.dto';
import { RefreshTokenDto } from '@modules/iam/dtos/refresh-token.dto';

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
    statusMock = jest.fn().mockReturnThis(); // Enables chaining
    jsonMock = jest.fn();

    const registerDto: RegisterDto = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'test@example.com',
      password: 'password123',
      role: Role.ADMIN,
      organizationId: 'org-1234',
    };

    req = { body: registerDto };
    res = { status: statusMock, json: jsonMock };

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
      const mockResult: RegisterDto = req.body as RegisterDto;
      (authService.register as jest.Mock).mockResolvedValue(mockResult);

      // Act
      await register(req as Request, res as Response);

      // Assert
      expect(authService.register).toHaveBeenCalledWith(req.body);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(mockResult);
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

      // Act & Assert
      await expect(register(req as Request, res as Response)).rejects.toThrow(
        'Validation Error',
      );
      expect(authService.register).toHaveBeenCalledWith(req.body);
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

      // Act & Assert
      await expect(register(req as Request, res as Response)).rejects.toThrow(
        'Service Error: Failed to register user',
      );
      expect(authService.register).toHaveBeenCalledWith(req.body);
    });
  });

  describe('when Redis connection needs to be closed', () => {
    it('should not close the Redis connection for singleton usage', async () => {
      // Arrange
      const mockResult: RegisterDto = req.body as RegisterDto;
      (authService.register as jest.Mock).mockResolvedValue(mockResult);

      // Act
      await register(req as Request, res as Response);

      // Assert
      expect(mockRedisClient.quit).not.toHaveBeenCalled(); // Singleton Redis should not be closed
    });
  });

  describe('when req.body is missing required fields', () => {
    it('should propagate validation errors for missing fields', async () => {
      // Arrange
      req.body = {}; // Missing fields

      const mockError = new AppError('Validation Error', 400);
      (authService.register as jest.Mock).mockRejectedValue(mockError);

      // Act & Assert
      await expect(register(req as Request, res as Response)).rejects.toThrow(
        'Validation Error',
      );
      expect(authService.register).toHaveBeenCalledWith(req.body);
    });
  });
});

describe('Auth Controller - Resend Verify Account Email', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;
  const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis(); // Enables chaining
    jsonMock = jest.fn();

    const resendEmailWithTokenDto: ResendEmailWithTokenDto = {
      token: 'valid-token',
    };

    req = { body: resendEmailWithTokenDto };
    res = { status: statusMock, json: jsonMock };

    // Reset Redis mock
    mockRedisClient.get.mockReset();
    mockRedisClient.set.mockReset();
    mockRedisClient.quit.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when resending verification email is successful', () => {
    it('should respond with 200 and the result from authService.resendVerifyAccountEmail', async () => {
      // Arrange
      const mockResult = { message: 'Verification email sent successfully' };
      (authService.resendVerifyAccountEmail as jest.Mock).mockResolvedValue(
        mockResult,
      );

      // Act
      await resendVerifyAccountEmail(req as Request, res as Response);

      // Assert
      expect(authService.resendVerifyAccountEmail).toHaveBeenCalledWith(
        req.body,
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('when there is a validation error from the service layer', () => {
    it('should propagate the validation error', async () => {
      // Arrange
      const mockError = new AppError('Invalid token', 400);
      (authService.resendVerifyAccountEmail as jest.Mock).mockRejectedValue(
        mockError,
      );

      req.body = { token: 'invalid-token' } as ResendEmailWithTokenDto;

      // Act & Assert
      await expect(
        resendVerifyAccountEmail(req as Request, res as Response),
      ).rejects.toThrow('Invalid token');
      expect(authService.resendVerifyAccountEmail).toHaveBeenCalledWith(
        req.body,
      );
    });
  });

  describe('when there is an unexpected error from the service layer', () => {
    it('should propagate the unexpected error', async () => {
      // Arrange
      const mockError = new AppError(
        'Service Error: Failed to send email',
        500,
      );
      (authService.resendVerifyAccountEmail as jest.Mock).mockRejectedValue(
        mockError,
      );

      // Act & Assert
      await expect(
        resendVerifyAccountEmail(req as Request, res as Response),
      ).rejects.toThrow('Service Error: Failed to send email');
      expect(authService.resendVerifyAccountEmail).toHaveBeenCalledWith(
        req.body,
      );
    });
  });

  describe('when Redis connection needs to be closed', () => {
    it('should not close the Redis connection for singleton usage', async () => {
      // Arrange
      const mockResult = { message: 'Verification email sent successfully' };
      (authService.resendVerifyAccountEmail as jest.Mock).mockResolvedValue(
        mockResult,
      );

      // Act
      await resendVerifyAccountEmail(req as Request, res as Response);

      // Assert
      expect(mockRedisClient.quit).not.toHaveBeenCalled(); // Singleton Redis should not be closed
    });
  });

  describe('when req.body is missing required fields', () => {
    it('should propagate validation errors for missing fields', async () => {
      // Arrange
      req.body = {}; // Missing token field

      const mockError = new AppError(
        'Validation Error: Token is required',
        400,
      );
      (authService.resendVerifyAccountEmail as jest.Mock).mockRejectedValue(
        mockError,
      );

      // Act & Assert
      await expect(
        resendVerifyAccountEmail(req as Request, res as Response),
      ).rejects.toThrow('Validation Error: Token is required');
      expect(authService.resendVerifyAccountEmail).toHaveBeenCalledWith(
        req.body,
      );
    });
  });
});

describe('Auth Controller - Send Verify Account Email', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;
  const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis(); // Enables chaining
    jsonMock = jest.fn();

    const sendEmailDto: SendEmailDto = {
      email: 'test@example.com',
      organizationId: 'org-1234',
    };

    req = { body: sendEmailDto };
    res = { status: statusMock, json: jsonMock };

    // Reset Redis mock
    mockRedisClient.get.mockReset();
    mockRedisClient.set.mockReset();
    mockRedisClient.quit.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when sending verification email is successful', () => {
    it('should respond with 200 and the result from authService.sendVerifyAccountEmail', async () => {
      // Arrange
      const mockResult = { message: 'Verification email sent successfully' };
      (authService.sendVerifyAccountEmail as jest.Mock).mockResolvedValue(
        mockResult,
      );

      // Act
      await sendVerifyAccountEmail(req as Request, res as Response);

      // Assert
      expect(authService.sendVerifyAccountEmail).toHaveBeenCalledWith(req.body);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('when there is a validation error from the service layer', () => {
    it('should propagate the validation error', async () => {
      // Arrange
      const mockError = new AppError('Invalid email format', 400);
      (authService.sendVerifyAccountEmail as jest.Mock).mockRejectedValue(
        mockError,
      );

      req.body = { email: 'invalid-email' } as SendEmailDto;

      // Act & Assert
      await expect(
        sendVerifyAccountEmail(req as Request, res as Response),
      ).rejects.toThrow('Invalid email format');
      expect(authService.sendVerifyAccountEmail).toHaveBeenCalledWith(req.body);
    });
  });

  describe('when there is an unexpected error from the service layer', () => {
    it('should propagate the unexpected error', async () => {
      // Arrange
      const mockError = new AppError(
        'Service Error: Failed to send email',
        500,
      );
      (authService.sendVerifyAccountEmail as jest.Mock).mockRejectedValue(
        mockError,
      );

      // Act & Assert
      await expect(
        sendVerifyAccountEmail(req as Request, res as Response),
      ).rejects.toThrow('Service Error: Failed to send email');
      expect(authService.sendVerifyAccountEmail).toHaveBeenCalledWith(req.body);
    });
  });

  describe('when Redis connection needs to be closed', () => {
    it('should not close the Redis connection for singleton usage', async () => {
      // Arrange
      const mockResult = { message: 'Verification email sent successfully' };
      (authService.sendVerifyAccountEmail as jest.Mock).mockResolvedValue(
        mockResult,
      );

      // Act
      await sendVerifyAccountEmail(req as Request, res as Response);

      // Assert
      expect(mockRedisClient.quit).not.toHaveBeenCalled(); // Singleton Redis should not be closed
    });
  });

  describe('when req.body is missing required fields', () => {
    it('should propagate validation errors for missing fields', async () => {
      // Arrange
      req.body = {}; // Missing email and organizationId

      const mockError = new AppError(
        'Validation Error: Email and organizationId are required',
        400,
      );
      (authService.sendVerifyAccountEmail as jest.Mock).mockRejectedValue(
        mockError,
      );

      // Act & Assert
      await expect(
        sendVerifyAccountEmail(req as Request, res as Response),
      ).rejects.toThrow(
        'Validation Error: Email and organizationId are required',
      );
      expect(authService.sendVerifyAccountEmail).toHaveBeenCalledWith(req.body);
    });
  });
});

describe('Auth Controller - Verify Account', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;
  const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis(); // Enables chaining
    jsonMock = jest.fn();

    const verifyAccountDto: VerifyAccountDto = {
      token: 'valid-verification-token',
    };

    req = { body: verifyAccountDto };
    res = { status: statusMock, json: jsonMock };

    // Reset Redis mock
    mockRedisClient.get.mockReset();
    mockRedisClient.set.mockReset();
    mockRedisClient.quit.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when account verification is successful', () => {
    it('should respond with 200 and the result from authService.verifyAccount', async () => {
      // Arrange
      const mockResult = { message: 'Account verified successfully' };
      (authService.verifyAccount as jest.Mock).mockResolvedValue(mockResult);

      // Act
      await verifyAccount(req as Request, res as Response);

      // Assert
      expect(authService.verifyAccount).toHaveBeenCalledWith(req.body);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('when there is a validation error from the service layer', () => {
    it('should propagate the validation error', async () => {
      // Arrange
      const mockError = new AppError('Invalid verification token', 400);
      (authService.verifyAccount as jest.Mock).mockRejectedValue(mockError);

      req.body = { token: 'invalid-token' } as VerifyAccountDto;

      // Act & Assert
      await expect(
        verifyAccount(req as Request, res as Response),
      ).rejects.toThrow('Invalid verification token');
      expect(authService.verifyAccount).toHaveBeenCalledWith(req.body);
    });
  });

  describe('when there is an unexpected error from the service layer', () => {
    it('should propagate the unexpected error', async () => {
      // Arrange
      const mockError = new AppError(
        'Service Error: Failed to verify account',
        500,
      );
      (authService.verifyAccount as jest.Mock).mockRejectedValue(mockError);

      // Act & Assert
      await expect(
        verifyAccount(req as Request, res as Response),
      ).rejects.toThrow('Service Error: Failed to verify account');
      expect(authService.verifyAccount).toHaveBeenCalledWith(req.body);
    });
  });

  describe('when Redis connection needs to be closed', () => {
    it('should not close the Redis connection for singleton usage', async () => {
      // Arrange
      const mockResult = { message: 'Account verified successfully' };
      (authService.verifyAccount as jest.Mock).mockResolvedValue(mockResult);

      // Act
      await verifyAccount(req as Request, res as Response);

      // Assert
      expect(mockRedisClient.quit).not.toHaveBeenCalled(); // Singleton Redis should not be closed
    });
  });

  describe('when req.body is missing required fields', () => {
    it('should propagate validation errors for missing fields', async () => {
      // Arrange
      req.body = {}; // Missing token field

      const mockError = new AppError(
        'Validation Error: Token is required',
        400,
      );
      (authService.verifyAccount as jest.Mock).mockRejectedValue(mockError);

      // Act & Assert
      await expect(
        verifyAccount(req as Request, res as Response),
      ).rejects.toThrow('Validation Error: Token is required');
      expect(authService.verifyAccount).toHaveBeenCalledWith(req.body);
    });
  });
});

describe('Auth Controller - Login', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;
  const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn();

    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
      organizationId: 'org-1234',
    };

    req = { body: loginDto };
    res = { status: statusMock, json: jsonMock };

    mockRedisClient.get.mockReset();
    mockRedisClient.set.mockReset();
    mockRedisClient.quit.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when login is successful', () => {
    it('should respond with 200 and the result from authService.login', async () => {
      const mockResult = {
        accessToken: 'jwt-token',
        refreshToken: 'refresh-token',
      };
      (authService.login as jest.Mock).mockResolvedValue(mockResult);

      await login(req as Request, res as Response);

      expect(authService.login).toHaveBeenCalledWith(req.body);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('when there is a validation error from the service layer', () => {
    it('should propagate the validation error', async () => {
      const mockError = new AppError('Invalid credentials', 400);
      (authService.login as jest.Mock).mockRejectedValue(mockError);

      req.body = { email: 'invalid-email', password: 'short' } as LoginDto;

      await expect(login(req as Request, res as Response)).rejects.toThrow(
        'Invalid credentials',
      );
      expect(authService.login).toHaveBeenCalledWith(req.body);
    });
  });

  describe('when there is an unexpected error from the service layer', () => {
    it('should propagate the unexpected error', async () => {
      const mockError = new AppError('Service Error: Failed to login', 500);
      (authService.login as jest.Mock).mockRejectedValue(mockError);

      await expect(login(req as Request, res as Response)).rejects.toThrow(
        'Service Error: Failed to login',
      );
      expect(authService.login).toHaveBeenCalledWith(req.body);
    });
  });

  describe('when Redis connection needs to be closed', () => {
    it('should not close the Redis connection for singleton usage', async () => {
      const mockResult = {
        accessToken: 'jwt-token',
        refreshToken: 'refresh-token',
      };
      (authService.login as jest.Mock).mockResolvedValue(mockResult);

      await login(req as Request, res as Response);

      expect(mockRedisClient.quit).not.toHaveBeenCalled();
    });
  });

  describe('when req.body is missing required fields', () => {
    it('should propagate validation errors for missing fields', async () => {
      req.body = {};

      const mockError = new AppError(
        'Validation Error: Email and password are required',
        400,
      );
      (authService.login as jest.Mock).mockRejectedValue(mockError);

      await expect(login(req as Request, res as Response)).rejects.toThrow(
        'Validation Error: Email and password are required',
      );
      expect(authService.login).toHaveBeenCalledWith(req.body);
    });
  });
});

describe('Auth Controller - Refresh Token', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;
  const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn();

    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: 'valid-refresh-token',
    };

    req = { body: refreshTokenDto };
    res = { status: statusMock, json: jsonMock };

    mockRedisClient.get.mockReset();
    mockRedisClient.set.mockReset();
    mockRedisClient.quit.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when refresh token is successful', () => {
    it('should respond with 200 and the result from authService.refreshToken', async () => {
      const mockResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      (authService.refreshToken as jest.Mock).mockResolvedValue(mockResult);

      await refreshToken(req as Request, res as Response);

      expect(authService.refreshToken).toHaveBeenCalledWith(req.body);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('when there is a validation error from the service layer', () => {
    it('should propagate the validation error', async () => {
      const mockError = new AppError('Invalid refresh token', 400);
      (authService.refreshToken as jest.Mock).mockRejectedValue(mockError);

      req.body = { refreshToken: 'invalid-token' } as RefreshTokenDto;

      await expect(
        refreshToken(req as Request, res as Response),
      ).rejects.toThrow('Invalid refresh token');

      expect(authService.refreshToken).toHaveBeenCalledWith(req.body);
    });
  });

  describe('when there is an unexpected error from the service layer', () => {
    it('should propagate the unexpected error', async () => {
      const mockError = new AppError(
        'Service Error: Failed to refresh token',
        500,
      );
      (authService.refreshToken as jest.Mock).mockRejectedValue(mockError);

      await expect(
        refreshToken(req as Request, res as Response),
      ).rejects.toThrow('Service Error: Failed to refresh token');

      expect(authService.refreshToken).toHaveBeenCalledWith(req.body);
    });
  });

  describe('when Redis connection needs to be closed', () => {
    it('should not close the Redis connection for singleton usage', async () => {
      const mockResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      (authService.refreshToken as jest.Mock).mockResolvedValue(mockResult);

      await refreshToken(req as Request, res as Response);

      expect(mockRedisClient.quit).not.toHaveBeenCalled();
    });
  });

  describe('when req.body is missing required fields', () => {
    it('should propagate validation errors for missing fields', async () => {
      req.body = {};

      const mockError = new AppError(
        'Validation Error: Refresh token is required',
        400,
      );
      (authService.refreshToken as jest.Mock).mockRejectedValue(mockError);

      await expect(
        refreshToken(req as Request, res as Response),
      ).rejects.toThrow('Validation Error: Refresh token is required');

      expect(authService.refreshToken).toHaveBeenCalledWith(req.body);
    });
  });
});
