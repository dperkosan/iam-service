// Set environment variables before any imports
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_TOKEN_AUDIENCE = 'test-audience';
process.env.JWT_TOKEN_ISSUER = 'test-issuer';
process.env.JWT_ACCESS_TOKEN_TTL = '3600';
process.env.JWT_REFRESH_TOKEN_TTL = '86400';
process.env.JWT_EMAIL_VERIFICATION_TOKEN_TTL = '2592000';
process.env.JWT_FORGOTTEN_PASSWORD_TOKEN_TTL = '2592000';

import jwt from 'jsonwebtoken';
import logger from '@common/log/app.log';
import { signToken, insertToken } from '@modules/iam/services/token.service';
import jwtConfig from '@common/config/jwt.config';
import { TokenType } from '@modules/iam/enums/token-type.enum';
import { redisClient } from '@redis/redis.client';
import { AppError } from '@common/errors/http-status.error';
import { Role } from '@modules/iam/enums/role.enum';

jest.mock('jsonwebtoken');
jest.mock('@redis/redis.client', () => ({
  redisClient: {
    set: jest.fn(),
  },
}));
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
        const result = await signToken(userId, tokenType, expiresIn, payload);

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
          signToken(userId, tokenType, expiresIn, payload),
        ).rejects.toThrow(AppError);
        await expect(
          signToken(userId, tokenType, expiresIn, payload),
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
        await insertToken(userId, tokenType, tokenId, expiresIn);

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
      it('should throw an error and not insert the token', async () => {
        // Arrange
        const redisSetSpy = jest
          .spyOn(redisClient, 'set')
          .mockRejectedValue(new Error('Redis Error'));

        // Act & Assert
        await expect(
          insertToken(userId, tokenType, tokenId, expiresIn),
        ).rejects.toThrow('Redis Error');
        expect(redisSetSpy).toHaveBeenCalledWith(
          `${tokenType}-user-${userId}`,
          tokenId,
          'EX',
          expiresIn,
        );
      });
    });
  });
});
