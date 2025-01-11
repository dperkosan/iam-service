// Set environment variables before any imports
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_TOKEN_AUDIENCE = 'test-audience';
process.env.JWT_TOKEN_ISSUER = 'test-issuer';
process.env.JWT_ACCESS_TOKEN_TTL = '3600';
process.env.JWT_REFRESH_TOKEN_TTL = '86400';
process.env.JWT_EMAIL_VERIFICATION_TOKEN_TTL = '2592000';
process.env.JWT_FORGOTTEN_PASSWORD_TOKEN_TTL = '2592000';

import { RegisterDto } from '@modules/iam/dtos/register.dto';
import * as userRepository from '@modules/iam/repositories/user.repository';
import { AppError } from '@common/errors/http-status.error';
import logger from '@common/log/app.log';
import * as authService from '@modules/iam/services/auth.service';
import { Role } from '@modules/iam/enums/role.enum';
import { hashData } from '@common/utils/hash.util';
import dataSource from '@database/config/typeorm.config';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import jwtConfig from '@common/config/jwt.config';
import { TokenType } from '@modules/iam/enums/token-type.enum';

jest.mock('@modules/iam/repositories/user.repository');
jest.mock('@common/log/app.log', () => ({
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock('@common/utils/hash.util');
jest.mock('@database/config/typeorm.config', () => ({
  transaction: jest.fn(),
}));
jest.mock('jsonwebtoken');
jest.mock('crypto', () => ({
  randomUUID: jest.fn(),
}));

describe('Auth Service - register', () => {
  const mockRegisterDto: RegisterDto = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'test@example.com',
    password: 'password123',
    role: Role.ADMIN,
  };

  const mockCreatedUser = { id: 1, email: 'test@example.com' };
  const mockHashedPassword = 'hashedPassword123';
  const mockTokenId = 'mock-token-id';
  const mockEmailVerificationToken = 'mock-email-verification-token';

  beforeEach(() => {
    jest.clearAllMocks();
    (randomUUID as jest.Mock).mockReturnValue(mockTokenId);
  });

  it('should successfully create a user and generate an email verification token', async () => {
    // Arrange
    (hashData as jest.Mock).mockResolvedValue(mockHashedPassword);
    (dataSource.transaction as jest.Mock).mockImplementation(async (callback) =>
      callback({
        getRepository: jest.fn(),
      }),
    );
    (userRepository.createUserInTransaction as jest.Mock).mockResolvedValue(
      mockCreatedUser,
    );
    (jwt.sign as jest.Mock).mockImplementation(
      (_payload, _secret, _options, callback) => {
        callback(null, mockEmailVerificationToken);
      },
    );

    // Act
    const result = await authService.register(mockRegisterDto);

    // Assert
    expect(hashData).toHaveBeenCalledWith(mockRegisterDto.password);
    expect(userRepository.createUserInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      {
        ...mockRegisterDto,
        password: mockHashedPassword,
      },
    );
    expect(jwt.sign).toHaveBeenCalledWith(
      {
        sub: mockCreatedUser.id,
        tokenType: TokenType.EMAIL_VERIFICATION,
        tokenId: mockTokenId,
      },
      jwtConfig.secret,
      {
        audience: jwtConfig.audience,
        issuer: jwtConfig.issuer,
        expiresIn: jwtConfig.emailVerificationTokenTtl,
      },
      expect.any(Function),
    );
    expect(result).toEqual(mockCreatedUser);
  });

  it('should throw validation/conflict error and log warning', async () => {
    // Arrange
    const validationError = new AppError(
      'Validation Error: Email already exists',
      400,
    );
    (dataSource.transaction as jest.Mock).mockRejectedValue(validationError);

    // Act & Assert
    await expect(authService.register(mockRegisterDto)).rejects.toThrow(
      validationError,
    );
    expect(logger.warn).toHaveBeenCalledWith(
      'Validation or Conflict Error:',
      validationError.message,
    );
  });

  it('should throw a generic service error for other AppErrors and log warning', async () => {
    // Arrange
    const genericAppError = new AppError('Some other service error', 500);
    (dataSource.transaction as jest.Mock).mockRejectedValue(genericAppError);

    // Act & Assert
    await expect(authService.register(mockRegisterDto)).rejects.toThrow(
      genericAppError,
    );
    expect(logger.warn).toHaveBeenCalledWith(
      'Service Error:',
      genericAppError.message,
    );
  });

  it('should throw an unexpected error and log it', async () => {
    // Arrange
    const unexpectedError = new Error('Unexpected Error');
    (dataSource.transaction as jest.Mock).mockRejectedValue(unexpectedError);

    // Act & Assert
    await expect(authService.register(mockRegisterDto)).rejects.toThrow(
      new AppError('Service Error: Failed to register user', 500),
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Unexpected Service Error:',
      unexpectedError,
    );
  });

  it('should throw an error if token generation fails', async () => {
    // Arrange
    const tokenError = new Error('Token generation failed');
    (hashData as jest.Mock).mockResolvedValue(mockHashedPassword);
    (dataSource.transaction as jest.Mock).mockImplementation(async (callback) =>
      callback({
        getRepository: jest.fn(),
      }),
    );
    (userRepository.createUserInTransaction as jest.Mock).mockResolvedValue(
      mockCreatedUser,
    );
    (jwt.sign as jest.Mock).mockImplementation(
      (_payload, _secret, _options, callback) => {
        callback(tokenError);
      },
    );

    // Act & Assert
    await expect(authService.register(mockRegisterDto)).rejects.toThrow(
      new AppError('Service Error: Failed to sign token', 500),
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to sign token:',
      tokenError,
    );
  });
});
