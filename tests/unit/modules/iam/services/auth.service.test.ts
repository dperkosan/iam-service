// Set environment variables before any imports
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_TOKEN_AUDIENCE = 'test-audience';
process.env.JWT_TOKEN_ISSUER = 'test-issuer';
process.env.JWT_ACCESS_TOKEN_TTL = '3600';
process.env.JWT_REFRESH_TOKEN_TTL = '86400';
process.env.JWT_EMAIL_VERIFICATION_TOKEN_TTL = '2592000';
process.env.JWT_FORGOTTEN_PASSWORD_TOKEN_TTL = '2592000';

import { RegisterDto } from '@modules/iam/dtos/register.dto';
import * as tokenService from '@modules/iam/services/token.service';
import * as mailerService from '@modules/iam/services/mailer.service';
import {
  AppError,
  BadRequestError,
  TokenRevokedError,
  UnauthorizedError,
} from '@common/errors/http-status.error';
import logger from '@common/log/app.log';
import * as authService from '@modules/iam/services/auth.service';
import { Role } from '@modules/iam/enums/role.enum';
import { hashData } from '@common/utils/hash.util';
import dataSource from '@database/config/typeorm.config';
import { randomUUID } from 'crypto';
import { TokenType } from '@modules/iam/enums/token-type.enum';
import jwtConfig from '@common/config/jwt.config';
import { createUserInTransaction } from '@modules/iam/repositories/user.repository.transaction';
import { userRepository } from '@modules/iam/repositories/user.repository';
import { ResendEmailWithTokenDto } from '@modules/iam/dtos/resend-email-with-token.dto';
import { EntityNotFoundError } from 'typeorm';

// Mock dependencies
jest.mock('@modules/iam/repositories/user.repository', () => ({
  userRepository: {
    findOneByOrFail: jest.fn(),
  },
}));
jest.mock('@modules/iam/repositories/user.repository.transaction', () => ({
  createUserInTransaction: jest.fn(),
}));

jest.mock('@common/utils/hash.util');
jest.mock('@database/config/typeorm.config', () => ({
  transaction: jest.fn(),
  getRepository: jest.fn().mockReturnValue({
    extend: jest.fn().mockReturnValue({}),
  }),
}));
jest.mock('crypto', () => ({
  randomUUID: jest.fn(),
}));
jest.mock('@modules/iam/services/token.service', () => ({
  signToken: jest.fn(),
  insertToken: jest.fn(),
  verifyToken: jest.fn(),
  validateToken: jest.fn(),
}));
jest.mock('@modules/iam/services/mailer.service', () => ({
  sendEmailVerification: jest.fn(),
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
    it('should create a user, generate an email verification token, save the token, and send an email', async () => {
      // Arrange
      (hashData as jest.Mock).mockResolvedValue(mockHashedPassword);
      (dataSource.transaction as jest.Mock).mockImplementation(
        async (callback) =>
          callback({
            getRepository: jest.fn(),
          }),
      );
      (createUserInTransaction as jest.Mock).mockResolvedValue(mockCreatedUser);
      (tokenService.signToken as jest.Mock).mockResolvedValue(
        mockEmailVerificationToken,
      );
      (tokenService.insertToken as jest.Mock).mockResolvedValue(undefined);
      (mailerService.sendEmailVerification as jest.Mock).mockResolvedValue(
        undefined,
      );

      // Act
      const result = await authService.register(mockRegisterDto);

      // Assert
      expect(hashData).toHaveBeenCalledWith(mockRegisterDto.password);
      expect(createUserInTransaction).toHaveBeenCalledWith(expect.anything(), {
        ...mockRegisterDto,
        password: mockHashedPassword,
      });
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
      expect(mailerService.sendEmailVerification).toHaveBeenCalledWith(
        mockCreatedUser.email,
        mockEmailVerificationToken,
      );
      expect(result).toEqual(mockCreatedUser);
    });
  });

  describe('when email and organization already exist', () => {
    it('should throw a validation error and log a warning', async () => {
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
    it('should throw a service error and log a warning', async () => {
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
    it('should throw a generic service error and log the unexpected error', async () => {
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
      (hashData as jest.Mock).mockResolvedValue(mockHashedPassword);
      (dataSource.transaction as jest.Mock).mockImplementation(
        async (callback) =>
          callback({
            getRepository: jest.fn(),
          }),
      );
      (createUserInTransaction as jest.Mock).mockResolvedValue(mockCreatedUser);
      (tokenService.signToken as jest.Mock).mockRejectedValue(
        new Error('Token generation failed'),
      );

      // Act & Assert
      await expect(authService.register(mockRegisterDto)).rejects.toThrow(
        new AppError('Service Error: Failed to register user', 500),
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Unexpected Service Error:',
        new Error('Token generation failed'),
      );
    });
  });
});

describe('Auth Service - resendVerifyAccountEmail', () => {
  const mockResendDto: ResendEmailWithTokenDto = {
    token: 'mock-token',
  };
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    emailVerified: false,
  };
  const mockNewTokenId = 'new-mock-token-id';
  const mockNewEmailVerificationToken = 'new-mock-email-verification-token';

  beforeEach(() => {
    jest.clearAllMocks();
    (randomUUID as jest.Mock).mockReturnValue(mockNewTokenId);
  });

  it('should resend email verification if the token is valid', async () => {
    (tokenService.verifyToken as jest.Mock).mockResolvedValue({
      sub: mockUser.id,
      tokenId: 'mock-token-id',
    });
    (userRepository.findOneByOrFail as jest.Mock).mockResolvedValue(mockUser);
    (tokenService.validateToken as jest.Mock).mockResolvedValue(undefined);
    (tokenService.signToken as jest.Mock).mockResolvedValue(
      mockNewEmailVerificationToken,
    );
    (tokenService.insertToken as jest.Mock).mockResolvedValue(undefined);
    (mailerService.sendEmailVerification as jest.Mock).mockResolvedValue(
      undefined,
    );

    const result = await authService.resendVerifyAccountEmail(mockResendDto);

    expect(result).toEqual('Email sent successfully');
  });

  it('should throw an error if user not found', async () => {
    (tokenService.verifyToken as jest.Mock).mockResolvedValue({
      sub: mockUser.id,
      tokenId: 'mock-token-id',
    });
    (userRepository.findOneByOrFail as jest.Mock).mockRejectedValue(
      new EntityNotFoundError('User', { id: mockUser.id }),
    );

    await expect(
      authService.resendVerifyAccountEmail(mockResendDto),
    ).rejects.toThrow(new AppError('User not found', 404));
  });

  it('should throw an error if token is revoked', async () => {
    (tokenService.verifyToken as jest.Mock).mockRejectedValue(
      new TokenRevokedError('Token revoked'),
    );

    await expect(
      authService.resendVerifyAccountEmail(mockResendDto),
    ).rejects.toThrow(TokenRevokedError);
  });

  it('should throw an error if token is unauthorized', async () => {
    (tokenService.verifyToken as jest.Mock).mockRejectedValue(
      new UnauthorizedError('Unauthorized'),
    );

    await expect(
      authService.resendVerifyAccountEmail(mockResendDto),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('should throw an error if email is already verified', async () => {
    const verifiedUser = { ...mockUser, emailVerified: true };
    (tokenService.verifyToken as jest.Mock).mockResolvedValue({
      sub: verifiedUser.id,
      tokenId: 'mock-token-id',
    });
    (userRepository.findOneByOrFail as jest.Mock).mockResolvedValue(
      verifiedUser,
    );

    await expect(
      authService.resendVerifyAccountEmail(mockResendDto),
    ).rejects.toThrow(new BadRequestError('Email is already verified.'));
  });

  it('should log an unexpected error and throw a service error', async () => {
    const unexpectedError = new Error('Unexpected failure');
    (tokenService.verifyToken as jest.Mock).mockRejectedValue(unexpectedError);

    await expect(
      authService.resendVerifyAccountEmail(mockResendDto),
    ).rejects.toThrow(
      new AppError('Service Error: Failed to resend email', 500),
    );

    expect(logger.error).toHaveBeenCalledWith(
      'Unexpected Service Error:',
      unexpectedError,
    );
  });
});
