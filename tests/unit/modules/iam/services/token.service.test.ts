import jwt, { JsonWebTokenError } from 'jsonwebtoken';
import logger from '@common/log/app.log';
import * as tokenService from '@modules/iam/services/token.service';

import jwtConfig from '@common/config/jwt.config';
import { TokenType } from '@modules/iam/enums/token-type.enum';
import { redisClient } from '@redis/redis.client';
import {
  AppError,
  TokenRevokedError,
  UnauthorizedError,
} from '@common/errors/http-status.error';
import { Role } from '@modules/iam/enums/role.enum';
import { randomUUID } from 'crypto';

jest.mock('crypto');
jest.mock('jsonwebtoken');
jest.mock('@redis/redis.client', () => {
  const redisMock = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };
  return { redisClient: redisMock };
});
jest.mock('@common/log/app.log', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

describe('Token Service', () => {
  const userId = '12345';
  const tokenType = TokenType.EMAIL_VERIFICATION;
  const payload = { role: Role.USER };
  const expiresIn = 3600;
  const token = 'mockToken';
  const tokenId = 'mockTokenId';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signToken', () => {
    describe('when signing a token successfully', () => {
      it('should sign a token and return it', async () => {
        // Arrange
        jest.spyOn(jwt, 'sign').mockImplementation((_, __, ___, callback) => {
          callback(null, token);
        });

        // Act
        const result = await tokenService.signToken(
          userId,
          tokenType,
          expiresIn,
          payload,
        );

        // Assert
        expect(result).toBe(token);
        expect(jwt.sign).toHaveBeenCalledWith(
          expect.objectContaining({
            sub: userId,
            tokenType,
            ...payload,
          }),
          jwtConfig.secret,
          expect.objectContaining({
            audience: jwtConfig.audience,
            issuer: jwtConfig.issuer,
            expiresIn,
          }),
          expect.any(Function),
        );
      });
    });

    describe('when signing a token fails', () => {
      it('should throw an AppError and log the error', async () => {
        // Arrange
        jest.spyOn(jwt, 'sign').mockImplementation((_, __, ___, callback) => {
          callback(new Error('JWT Signing Error'), undefined);
        });

        // Act & Assert
        await expect(
          tokenService.signToken(userId, tokenType, expiresIn, payload),
        ).rejects.toThrow(AppError);
        await expect(
          tokenService.signToken(userId, tokenType, expiresIn, payload),
        ).rejects.toThrow('Service Error: Failed to sign token');
        expect(logger.error).toHaveBeenCalledWith(
          'Failed to sign token:',
          expect.any(Error),
        );
      });
    });
  });

  describe('insertToken', () => {
    describe('when inserting a token into Redis successfully', () => {
      it('should insert the token and return successfully', async () => {
        // Arrange
        const redisSetSpy = jest
          .spyOn(redisClient, 'set')
          .mockResolvedValue('OK');

        // Act
        await tokenService.insertToken(userId, tokenType, tokenId, expiresIn);

        // Assert
        expect(redisSetSpy).toHaveBeenCalledWith(
          `${tokenType}-user-${userId}`,
          tokenId,
          'EX',
          expiresIn,
        );
      });
    });

    describe('when Redis set operation fails', () => {
      it('should throw an AppError with a service error message and not insert the token', async () => {
        // Arrange
        const redisSetSpy = jest
          .spyOn(redisClient, 'set')
          .mockRejectedValue(new Error('Redis Error'));

        // Act & Assert
        await expect(
          tokenService.insertToken(userId, tokenType, tokenId, expiresIn),
        ).rejects.toThrow('Service Error: Failed to insert token');

        expect(redisSetSpy).toHaveBeenCalledWith(
          `${tokenType}-user-${userId}`,
          tokenId,
          'EX',
          expiresIn,
        );
      });
    });
  });

  describe('verifyToken', () => {
    it('should return the decoded token when valid', async () => {
      jest.spyOn(jwt, 'verify').mockImplementation((_, __, ___, callback) => {
        if (callback) {
          callback(null, { sub: userId, tokenType });
        }
      });

      const result = await tokenService.verifyToken(token);
      expect(result).toEqual({ sub: userId, tokenType });
    });

    it('should throw an UnauthorizedError when invalid', async () => {
      jest.spyOn(jwt, 'verify').mockImplementation((_, __, ___, callback) => {
        if (callback) {
          callback(new JsonWebTokenError('JWT Verification Error'), undefined);
        }
      });

      await expect(tokenService.verifyToken(token)).rejects.toThrow(
        UnauthorizedError,
      );
    });
  });

  describe('validateToken', () => {
    it('should return true when token is valid', async () => {
      jest.spyOn(redisClient, 'get').mockResolvedValue(tokenId);

      const result = await tokenService.validateToken(
        userId,
        tokenType,
        tokenId,
      );
      expect(result).toBe(true);
    });

    it('should throw a TokenRevokedError if token is not in Redis', async () => {
      jest.spyOn(redisClient, 'get').mockResolvedValue(null);

      await expect(
        tokenService.validateToken(userId, tokenType, tokenId),
      ).rejects.toThrow(TokenRevokedError);
    });

    it('should throw a TokenRevokedError if token does not match', async () => {
      jest.spyOn(redisClient, 'get').mockResolvedValue('differentTokenId');

      await expect(
        tokenService.validateToken(userId, tokenType, tokenId),
      ).rejects.toThrow(TokenRevokedError);
    });

    it('should log an error and throw an AppError if Redis get operation fails', async () => {
      const redisError = new Error('Redis connection error');
      jest.spyOn(redisClient, 'get').mockRejectedValue(redisError);

      await expect(
        tokenService.validateToken(userId, tokenType, tokenId),
      ).rejects.toThrow(AppError);
      await expect(
        tokenService.validateToken(userId, tokenType, tokenId),
      ).rejects.toThrow('Service Error: Failed to validate token');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to validate token:',
        redisError,
      );
    });
  });

  describe('invalidateToken', () => {
    it('should delete the token from Redis successfully', async () => {
      // Arrange
      jest.spyOn(redisClient, 'del').mockResolvedValue(1); // Simulate successful deletion

      // Act
      await tokenService.invalidateToken(userId, tokenType);

      // Assert
      expect(redisClient.del).toHaveBeenCalledWith(
        `${tokenType}-user-${userId}`,
      );
    });

    it('should log a warning if the token is not found or already invalidated', async () => {
      // Arrange
      jest.spyOn(redisClient, 'del').mockResolvedValue(0); // Simulate token not found

      // Act
      await tokenService.invalidateToken(userId, tokenType);

      // Assert
      expect(redisClient.del).toHaveBeenCalledWith(
        `${tokenType}-user-${userId}`,
      );
      expect(logger.warn).toHaveBeenCalledWith(
        `Token not found or already invalidated for key: ${tokenType}-user-${userId}`,
      );
    });

    it('should throw an AppError and log the error if Redis delete operation fails', async () => {
      // Arrange
      jest
        .spyOn(redisClient, 'del')
        .mockRejectedValue(new Error('Redis Error'));

      // Act & Assert
      await expect(
        tokenService.invalidateToken(userId, tokenType),
      ).rejects.toThrow(AppError);
      await expect(
        tokenService.invalidateToken(userId, tokenType),
      ).rejects.toThrow('Service Error: Failed to invalidate token');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to invalidate token:',
        expect.any(Error),
      );
    });
  });
});

describe('generateAccessTokens', () => {
  const userId = '12345';
  const organizationId = 'org123';
  const email = 'user@example.com';
  const role = Role.USER;
  const accessToken = 'mockAccessToken';
  const refreshToken = 'mockRefreshToken';
  const refreshTokenId = 'mockRefreshTokenId';

  beforeEach(() => {
    jest.clearAllMocks();
    (randomUUID as jest.Mock).mockReturnValue(refreshTokenId);
    jest.spyOn(tokenService, 'signToken').mockReset();
    jest.spyOn(tokenService, 'insertToken').mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should generate access and refresh tokens and insert refresh token into Redis', async () => {
    jest.spyOn(tokenService, 'signToken').mockResolvedValueOnce(accessToken);
    jest.spyOn(tokenService, 'signToken').mockResolvedValueOnce(refreshToken);
    jest.spyOn(tokenService, 'insertToken').mockResolvedValue(undefined);

    const result = await tokenService.generateAccessTokens(
      userId,
      organizationId,
      email,
      role,
    );

    expect(randomUUID).toHaveBeenCalled();
    expect(tokenService.signToken).toHaveBeenCalledTimes(2);
    expect(tokenService.signToken).toHaveBeenNthCalledWith(
      1,
      userId,
      TokenType.AUTH,
      jwtConfig.accessTokenTtl,
      {
        organizationId,
        email,
        role,
      },
    );
    expect(tokenService.signToken).toHaveBeenNthCalledWith(
      2,
      userId,
      TokenType.REFRESH,
      jwtConfig.refreshTokenTtl,
      {
        tokenId: refreshTokenId,
      },
    );
    expect(tokenService.insertToken).toHaveBeenCalledWith(
      userId,
      TokenType.REFRESH,
      refreshTokenId,
      jwtConfig.refreshTokenTtl,
    );
    expect(result).toEqual({ accessToken, refreshToken });
  });

  it('should throw an AppError and log the error if token generation fails', async () => {
    const error = new Error('Token generation error');
    jest.spyOn(tokenService, 'signToken').mockRejectedValue(error);

    await expect(
      tokenService.generateAccessTokens(userId, organizationId, email, role),
    ).rejects.toThrow(AppError);
    await expect(
      tokenService.generateAccessTokens(userId, organizationId, email, role),
    ).rejects.toThrow('Service Error: Failed to generate tokens');

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to generate tokens:',
      error,
    );
  });

  it('should throw an AppError and log the error if inserting refresh token into Redis fails', async () => {
    const error = new Error('Redis insertion error');
    jest.spyOn(tokenService, 'signToken').mockResolvedValueOnce(accessToken);
    jest.spyOn(tokenService, 'signToken').mockResolvedValueOnce(refreshToken);
    jest.spyOn(tokenService, 'insertToken').mockRejectedValue(error);

    await expect(
      tokenService.generateAccessTokens(userId, organizationId, email, role),
    ).rejects.toThrow(AppError);
    await expect(
      tokenService.generateAccessTokens(userId, organizationId, email, role),
    ).rejects.toThrow('Service Error: Failed to generate tokens');

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to generate tokens:',
      error,
    );
  });
});
