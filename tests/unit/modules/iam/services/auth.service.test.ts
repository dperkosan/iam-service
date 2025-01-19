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
import * as tokenService from '@modules/iam/services/token.service';
import { AppError } from '@common/errors/http-status.error';
import logger from '@common/log/app.log';
import * as authService from '@modules/iam/services/auth.service';
import { Role } from '@modules/iam/enums/role.enum';
import { hashData } from '@common/utils/hash.util';
import dataSource from '@database/config/typeorm.config';
import { randomUUID } from 'crypto';
import { TokenType } from '@modules/iam/enums/token-type.enum';
import jwtConfig from '@common/config/jwt.config';

// Mock dependencies
jest.mock('@modules/iam/repositories/user.repository');
jest.mock('@common/utils/hash.util');
jest.mock('@database/config/typeorm.config', () => ({
  transaction: jest.fn(),
}));
jest.mock('crypto', () => ({
  randomUUID: jest.fn(),
}));
jest.mock('@modules/iam/services/token.service', () => ({
  signToken: jest.fn(),
  insertToken: jest.fn(),
}));
jest.mock('@common/log/app.log', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('Auth Service - register', () => {
  const mockRegisterDto: RegisterDto = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'test@example.com',
    password: 'password123',
    role: Role.ADMIN,
    organizationId: 'org-1234',
  };

  const mockCreatedUser = {
    id: 1,
    email: 'test@example.com',
    organizationId: 'org-1234',
  };
  const mockHashedPassword = 'hashedPassword123';
  const mockTokenId = 'mock-token-id';
  const mockEmailVerificationToken = 'mock-email-verification-token';

  beforeEach(() => {
    jest.clearAllMocks();
    (randomUUID as jest.Mock).mockReturnValue(mockTokenId);
  });

  describe('when user registration is successful', () => {
    it('should create a user, generate an email verification token, and save the token', async () => {
      // Arrange
      (hashData as jest.Mock).mockResolvedValue(mockHashedPassword);
      (dataSource.transaction as jest.Mock).mockImplementation(
        async (callback) =>
          callback({
            getRepository: jest.fn(),
          }),
      );
      (userRepository.createUserInTransaction as jest.Mock).mockResolvedValue(
        mockCreatedUser,
      );
      (tokenService.signToken as jest.Mock).mockResolvedValue(
        mockEmailVerificationToken,
      );
      (tokenService.insertToken as jest.Mock).mockResolvedValue(undefined);

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
      expect(tokenService.signToken).toHaveBeenCalledWith(
        mockCreatedUser.id,
        TokenType.EMAIL_VERIFICATION,
        jwtConfig.emailVerificationTokenTtl,
        { tokenId: mockTokenId },
      );
      expect(tokenService.insertToken).toHaveBeenCalledWith(
        mockCreatedUser.id,
        TokenType.EMAIL_VERIFICATION,
        mockTokenId,
        jwtConfig.emailVerificationTokenTtl,
      );
      expect(result).toEqual(mockCreatedUser);
    });
  });

  describe('when email and organization already exist', () => {
    it('should throw validation/conflict error and log a warning', async () => {
      // Arrange
      const validationError = new AppError(
        'Validation Error: Email and organizationId combination already exists',
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
  });

  describe('when a generic service error occurs', () => {
    it('should throw a generic service error and log a warning', async () => {
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
  });

  describe('when an unexpected error occurs', () => {
    it('should throw a service error and log the unexpected error', async () => {
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
  });

  describe('when token generation fails', () => {
    it('should throw a service error and log the token generation error', async () => {
      // Arrange
      const tokenError = new Error('Token generation failed');
      (hashData as jest.Mock).mockResolvedValue(mockHashedPassword);
      (dataSource.transaction as jest.Mock).mockImplementation(
        async (callback) =>
          callback({
            getRepository: jest.fn(),
          }),
      );
      (userRepository.createUserInTransaction as jest.Mock).mockResolvedValue(
        mockCreatedUser,
      );
      (tokenService.signToken as jest.Mock).mockRejectedValue(tokenError);

      // Act & Assert
      await expect(authService.register(mockRegisterDto)).rejects.toThrow(
        new AppError('Service Error: Failed to register user', 500),
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Unexpected Service Error:',
        tokenError,
      );
    });
  });
});
