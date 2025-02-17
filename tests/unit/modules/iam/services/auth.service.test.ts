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
import { compareData, hashData } from '@common/utils/hash.util';
import dataSource from '@database/config/typeorm.config';
import { randomUUID } from 'crypto';
import { TokenType } from '@modules/iam/enums/token-type.enum';
import jwtConfig from '@common/config/jwt.config';
import { createUserInTransaction } from '@modules/iam/repositories/user.repository.transaction';
import { userRepository } from '@modules/iam/repositories/user.repository';
import { ResendEmailWithTokenDto } from '@modules/iam/dtos/resend-email-with-token.dto';
import { EntityNotFoundError } from 'typeorm';
import { SendEmailDto } from '@modules/iam/dtos/send-email.dto';
import { VerifyAccountDto } from '@modules/iam/dtos/verify-account.dto';
import { LoginDto } from '@modules/iam/dtos/login.dto';
import { RefreshTokenDto } from '@modules/iam/dtos/refresh-token.dto';

// Mock dependencies
jest.mock('@modules/iam/repositories/user.repository', () => ({
  userRepository: {
    findOneBy: jest.fn(),
    findOneByOrFail: jest.fn(),
    update: jest.fn(),
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
  invalidateToken: jest.fn(),
  generateAccessTokens: jest.fn(),
}));
jest.mock('@modules/iam/services/mailer.service', () => ({
  sendEmailVerification: jest.fn(),
  sendWelcomeMail: jest.fn(),
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
    ).rejects.toThrow(new AppError('Service Error: Failed to send email', 500));

    expect(logger.error).toHaveBeenCalledWith(
      'Unexpected Service Error:',
      unexpectedError,
    );
  });
});

describe('Auth Service - sendVerifyAccountEmail', () => {
  const mockSendEmailDto: SendEmailDto = {
    email: 'test@example.com',
    organizationId: 'org-1234',
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

  it('should send a verification email if the user exists and email is not verified', async () => {
    (userRepository.findOneBy as jest.Mock).mockResolvedValue(mockUser);
    (tokenService.signToken as jest.Mock).mockResolvedValue(
      mockNewEmailVerificationToken,
    );
    (tokenService.insertToken as jest.Mock).mockResolvedValue(undefined);
    (mailerService.sendEmailVerification as jest.Mock).mockResolvedValue(
      undefined,
    );

    const result = await authService.sendVerifyAccountEmail(mockSendEmailDto);

    expect(tokenService.signToken).toHaveBeenCalledWith(
      mockUser.id,
      TokenType.EMAIL_VERIFICATION,
      jwtConfig.emailVerificationTokenTtl,
      { tokenId: mockNewTokenId },
    );
    expect(tokenService.insertToken).toHaveBeenCalledWith(
      mockUser.id,
      TokenType.EMAIL_VERIFICATION,
      mockNewTokenId,
      jwtConfig.emailVerificationTokenTtl,
    );
    expect(mailerService.sendEmailVerification).toHaveBeenCalledWith(
      mockUser.email,
      mockNewEmailVerificationToken,
    );
    expect(result).toEqual('Email sent successfully');
  });

  it('should return an empty object if user does not exist', async () => {
    (userRepository.findOneBy as jest.Mock).mockResolvedValue(null);

    const result = await authService.sendVerifyAccountEmail(mockSendEmailDto);

    expect(result).toEqual({});
  });

  it('should throw an error if email is already verified', async () => {
    const verifiedUser = { ...mockUser, emailVerified: true };
    (userRepository.findOneBy as jest.Mock).mockResolvedValue(verifiedUser);

    await expect(
      authService.sendVerifyAccountEmail(mockSendEmailDto),
    ).rejects.toThrow(new BadRequestError('Email is already verified.'));
  });

  it('should log an unexpected error and throw a service error', async () => {
    const unexpectedError = new Error('Unexpected failure');
    (userRepository.findOneBy as jest.Mock).mockRejectedValue(unexpectedError);

    await expect(
      authService.sendVerifyAccountEmail(mockSendEmailDto),
    ).rejects.toThrow(new AppError('Service Error: Failed to send email', 500));

    expect(logger.error).toHaveBeenCalledWith(
      'Unexpected Service Error:',
      unexpectedError,
    );
  });
});

describe('Auth Service - verifyAccount', () => {
  const mockVerifyAccountDto: VerifyAccountDto = {
    token: 'mock-token',
  };

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    emailVerified: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should verify account successfully if the token is valid', async () => {
    (tokenService.verifyToken as jest.Mock).mockResolvedValue({
      sub: mockUser.id,
      tokenId: 'mock-token-id',
    });
    (userRepository.findOneByOrFail as jest.Mock).mockResolvedValue(mockUser);
    (tokenService.validateToken as jest.Mock).mockResolvedValue(undefined);
    (tokenService.invalidateToken as jest.Mock).mockResolvedValue(undefined);
    (userRepository.update as jest.Mock).mockResolvedValue(undefined);
    (mailerService.sendWelcomeMail as jest.Mock).mockResolvedValue(undefined);

    const result = await authService.verifyAccount(mockVerifyAccountDto);

    expect(tokenService.validateToken).toHaveBeenCalledWith(
      mockUser.id,
      TokenType.EMAIL_VERIFICATION,
      'mock-token-id',
    );
    expect(tokenService.invalidateToken).toHaveBeenCalledWith(
      mockUser.id,
      TokenType.EMAIL_VERIFICATION,
    );
    expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, {
      emailVerified: true,
    });
    expect(mailerService.sendWelcomeMail).toHaveBeenCalledWith(mockUser.email);
    expect(result).toEqual('Account is successfully verified!');
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
      authService.verifyAccount(mockVerifyAccountDto),
    ).rejects.toThrow(new AppError('User not found', 404));
  });

  it('should throw an error if token is revoked', async () => {
    (tokenService.verifyToken as jest.Mock).mockRejectedValue(
      new TokenRevokedError('Token revoked'),
    );

    await expect(
      authService.verifyAccount(mockVerifyAccountDto),
    ).rejects.toThrow(TokenRevokedError);
  });

  it('should throw an error if token is unauthorized', async () => {
    (tokenService.verifyToken as jest.Mock).mockRejectedValue(
      new UnauthorizedError('Unauthorized'),
    );

    await expect(
      authService.verifyAccount(mockVerifyAccountDto),
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
      authService.verifyAccount(mockVerifyAccountDto),
    ).rejects.toThrow(new BadRequestError('Email is already verified.'));
  });

  it('should log an unexpected error and throw a service error', async () => {
    const unexpectedError = new Error('Unexpected failure');
    (tokenService.verifyToken as jest.Mock).mockRejectedValue(unexpectedError);

    await expect(
      authService.verifyAccount(mockVerifyAccountDto),
    ).rejects.toThrow(
      new AppError('Service Error: Failed to verify account', 500),
    );

    expect(logger.error).toHaveBeenCalledWith(
      'Unexpected Service Error:',
      unexpectedError,
    );
  });
});

describe('Auth Service - login', () => {
  const mockLoginDto: LoginDto = {
    email: 'test@example.com',
    password: 'password123',
    organizationId: 'org-1234',
  };

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    password: 'hashedPassword123',
    organizationId: 'org-1234',
    enabled: true,
    emailVerified: true,
    role: 'ADMIN',
  };
  const mockAccessTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should login successfully if credentials are valid', async () => {
    (userRepository.findOneByOrFail as jest.Mock).mockResolvedValue(mockUser);
    (hashData as jest.Mock).mockResolvedValue('hashedPassword123');
    (tokenService.generateAccessTokens as jest.Mock).mockResolvedValue(
      mockAccessTokens,
    );
    (compareData as jest.Mock).mockResolvedValue(true);

    const result = await authService.login(mockLoginDto);

    expect(userRepository.findOneByOrFail).toHaveBeenCalledWith({
      email: mockLoginDto.email,
      organizationId: mockLoginDto.organizationId,
    });
    expect(compareData).toHaveBeenCalledWith(
      mockLoginDto.password,
      mockUser.password,
    );
    expect(tokenService.generateAccessTokens).toHaveBeenCalledWith(
      mockUser.id,
      mockUser.organizationId,
      mockUser.email,
      mockUser.role,
    );
    expect(result).toEqual(mockAccessTokens);
  });

  it('should throw UnauthorizedError if user is not found', async () => {
    (userRepository.findOneByOrFail as jest.Mock).mockRejectedValue(
      new EntityNotFoundError('User', { id: 1 }),
    );

    await expect(authService.login(mockLoginDto)).rejects.toThrow(
      new UnauthorizedError('User credentials are invalid.'),
    );

    expect(logger.warn).toHaveBeenCalledWith('User not found');
  });

  it('should throw UnauthorizedError if password is incorrect', async () => {
    (userRepository.findOneByOrFail as jest.Mock).mockResolvedValue(mockUser);
    (compareData as jest.Mock).mockResolvedValue(false);

    await expect(authService.login(mockLoginDto)).rejects.toThrow(
      new UnauthorizedError('User credentials are invalid.'),
    );
  });

  it('should throw UnauthorizedError if user account is not enabled', async () => {
    const disabledUser = { ...mockUser, enabled: false };
    (userRepository.findOneByOrFail as jest.Mock).mockResolvedValue(
      disabledUser,
    );
    (compareData as jest.Mock).mockResolvedValue(true);

    await expect(authService.login(mockLoginDto)).rejects.toThrow(
      new UnauthorizedError('User account is not enabled.'),
    );
  });

  it('should throw UnauthorizedError if user email is not verified', async () => {
    const unverifiedUser = { ...mockUser, emailVerified: false };
    (userRepository.findOneByOrFail as jest.Mock).mockResolvedValue(
      unverifiedUser,
    );
    (compareData as jest.Mock).mockResolvedValue(true);

    await expect(authService.login(mockLoginDto)).rejects.toThrow(
      new UnauthorizedError('User email is not verified.'),
    );
  });

  it('should throw AppError and log a warning if an AppError occurs', async () => {
    const appError = new AppError('Service Error', 500);
    (userRepository.findOneByOrFail as jest.Mock).mockRejectedValue(appError);

    await expect(authService.login(mockLoginDto)).rejects.toThrow(appError);

    expect(logger.warn).toHaveBeenCalledWith(
      'Service Error:',
      appError.message,
    );
  });

  it('should throw generic AppError if an unexpected error occurs', async () => {
    const unexpectedError = new Error('Unexpected Error');
    (userRepository.findOneByOrFail as jest.Mock).mockRejectedValue(
      unexpectedError,
    );

    await expect(authService.login(mockLoginDto)).rejects.toThrow(
      new AppError('Service Error: Failed to login', 500),
    );

    expect(logger.error).toHaveBeenCalledWith(
      'Unexpected Service Error:',
      unexpectedError,
    );
  });
});

describe('Auth Service - refreshToken', () => {
  const mockRefreshTokenDto: RefreshTokenDto = {
    refreshToken: 'valid-refresh-token',
  };

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    organizationId: 'org-1234',
    role: 'ADMIN',
  };

  const mockAccessTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should refresh token successfully if token is valid', async () => {
    (tokenService.verifyToken as jest.Mock).mockResolvedValue({
      sub: mockUser.id,
      tokenId: 'mock-token-id',
    });
    (userRepository.findOneByOrFail as jest.Mock).mockResolvedValue(mockUser);
    (tokenService.validateToken as jest.Mock).mockResolvedValue(undefined);
    (tokenService.invalidateToken as jest.Mock).mockResolvedValue(undefined);
    (tokenService.generateAccessTokens as jest.Mock).mockResolvedValue(
      mockAccessTokens,
    );

    const result = await authService.refreshToken(mockRefreshTokenDto);

    expect(tokenService.verifyToken).toHaveBeenCalledWith(
      mockRefreshTokenDto.refreshToken,
    );
    expect(userRepository.findOneByOrFail).toHaveBeenCalledWith({
      id: mockUser.id,
    });
    expect(tokenService.validateToken).toHaveBeenCalledWith(
      mockUser.id,
      TokenType.REFRESH,
      'mock-token-id',
    );
    expect(tokenService.invalidateToken).toHaveBeenCalledWith(
      mockUser.id,
      TokenType.REFRESH,
    );
    expect(tokenService.generateAccessTokens).toHaveBeenCalledWith(
      mockUser.id,
      mockUser.organizationId,
      mockUser.email,
      mockUser.role,
    );
    expect(result).toEqual(mockAccessTokens);
  });

  it('should throw an error if user is not found', async () => {
    (tokenService.verifyToken as jest.Mock).mockResolvedValue({
      sub: mockUser.id,
      tokenId: 'mock-token-id',
    });
    (userRepository.findOneByOrFail as jest.Mock).mockRejectedValue(
      new EntityNotFoundError('User', { id: mockUser.id }),
    );

    await expect(authService.refreshToken(mockRefreshTokenDto)).rejects.toThrow(
      new AppError('User not found', 404),
    );
  });

  it('should throw TokenRevokedError if token is revoked', async () => {
    (tokenService.verifyToken as jest.Mock).mockRejectedValue(
      new TokenRevokedError('Token revoked'),
    );

    await expect(authService.refreshToken(mockRefreshTokenDto)).rejects.toThrow(
      TokenRevokedError,
    );
  });

  it('should throw UnauthorizedError if token is invalid/expired', async () => {
    (tokenService.verifyToken as jest.Mock).mockRejectedValue(
      new UnauthorizedError('Unauthorized'),
    );

    await expect(authService.refreshToken(mockRefreshTokenDto)).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it('should log a warning and rethrow AppError', async () => {
    const appError = new AppError('Service Error: Custom app error', 400);
    (tokenService.verifyToken as jest.Mock).mockRejectedValue(appError);

    await expect(authService.refreshToken(mockRefreshTokenDto)).rejects.toThrow(
      appError,
    );
    expect(logger.warn).toHaveBeenCalledWith(
      'Service Error:',
      appError.message,
    );
  });

  it('should log an unexpected error and throw a service error', async () => {
    const unexpectedError = new Error('Unexpected failure');
    (tokenService.verifyToken as jest.Mock).mockRejectedValue(unexpectedError);

    await expect(authService.refreshToken(mockRefreshTokenDto)).rejects.toThrow(
      new AppError('Service Error: Failed to verify account', 500),
    );

    expect(logger.error).toHaveBeenCalledWith(
      'Unexpected Service Error:',
      unexpectedError,
    );
  });
});
