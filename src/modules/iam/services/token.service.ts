import jwt from 'jsonwebtoken';
import jwtConfig from '@common/config/jwt.config';
import { User } from '@modules/iam/entities/user.entity';
import { TokenType } from '@modules/iam/enums/token-type.enum';
import { TokenPayload } from '@modules/iam/types/token-payload.type';
import {
  AppError,
  TokenRevokedError,
  UnauthorizedError,
} from '@common/errors/http-status.error';
import logger from '@common/log/app.log';
import { redisClient } from '@redis/redis.client';
import { DecodedToken } from '@modules/iam/types/auth.types';

export const signToken = async (
  userId: User['id'],
  tokenType: TokenType,
  expiresIn: number,
  payload?: TokenPayload,
): Promise<string> => {
  try {
    return await new Promise((resolve, reject) => {
      jwt.sign(
        {
          sub: userId,
          tokenType,
          ...payload,
        },
        jwtConfig.secret,
        {
          audience: jwtConfig.audience,
          issuer: jwtConfig.issuer,
          expiresIn,
        },
        (err, token) => {
          if (err) {
            reject(err);
          } else {
            resolve(token as string);
          }
        },
      );
    });
  } catch (error) {
    logger.error('Failed to sign token:', error);
    throw new AppError('Service Error: Failed to sign token', 500);
  }
};

export const verifyToken = async (token: string): Promise<DecodedToken> => {
  try {
    return await new Promise((resolve, reject) => {
      jwt.verify(
        token,
        jwtConfig.secret,
        {
          audience: jwtConfig.audience,
          issuer: jwtConfig.issuer,
        },
        (err, decoded) => {
          if (err) {
            reject(err);
          } else {
            resolve(decoded as DecodedToken);
          }
        },
      );
    });
  } catch (error) {
    logger.error('Failed to verify token:', error);
    throw new UnauthorizedError('Unauthorized: Invalid or expired token');
  }
};

export const validateToken = async (
  userId: User['id'],
  tokenType: TokenType,
  tokenId: string,
): Promise<boolean> => {
  const storedId = await redisClient.get(getKey(userId, tokenType));

  if (!storedId || storedId !== tokenId) {
    throw new TokenRevokedError();
  }

  return true;
};

export const invalidateToken = async (
  userId: User['id'],
  tokenType: TokenType,
): Promise<void> => {
  try {
    const key = getKey(userId, tokenType);
    const result = await redisClient.del(key);

    if (result === 0) {
      logger.warn(`Token not found or already invalidated for key: ${key}`);
    }
  } catch (error) {
    logger.error('Failed to invalidate token:', error);
    throw new AppError('Service Error: Failed to invalidate token', 500);
  }
};

export const insertToken = async (
  userId: User['id'],
  tokenType: TokenType,
  tokenId: string,
  expiresIn: number,
): Promise<void> => {
  await redisClient.set(getKey(userId, tokenType), tokenId, 'EX', expiresIn);
};

const getKey = (userId: User['id'], tokenType: TokenType): string => {
  return `${tokenType}-user-${userId}`;
};
