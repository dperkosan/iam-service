import jwt from 'jsonwebtoken';
import jwtConfig from '@common/config/jwt.config';
import { User } from '@modules/iam/entities/user.entity';
import { TokenType } from '@modules/iam/enums/token-type.enum';
import { TokenPayload } from '@modules/iam/types/token-payload.type';
import { AppError } from '@common/errors/http-status.error';
import logger from '@common/log/app.log';
import { redisClient } from '@redis/redis.client';

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
