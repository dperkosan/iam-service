import jwt from 'jsonwebtoken';
import { RegisterDto } from '@modules/iam/dtos/register.dto';
import * as userRepository from '@modules/iam/repositories/user.repository';
import { AppError } from '@common/errors/http-status.error';
import logger from '@common/log/app.log';
import { hashData } from '@common/utils/hash.util';
import dataSource from '@database/config/typeorm.config';
import { randomUUID } from 'crypto';
import { User } from '@modules/iam/entities/user.entity';
import { TokenType } from '@modules/iam/enums/token-type.enum';
import jwtConfig from '@common/config/jwt.config';
import { TokenPayload } from '@modules/iam/types/token-payload.type';

export const register = async (registerDto: RegisterDto) => {
  try {
    const result = await dataSource.transaction(async (transactionManager) => {
      const hashedPassword = await hashData(registerDto.password);

      const userToCreate = { ...registerDto, password: hashedPassword };

      const createdUser = await userRepository.createUserInTransaction(
        transactionManager,
        userToCreate,
      );

      // create and save email verification token
      const tokenId = randomUUID();
      const emailVerificationToken = await signToken(
        createdUser.id,
        TokenType.EMAIL_VERIFICATION,
        jwtConfig.emailVerificationTokenTtl,
        { tokenId },
      );
      console.log(emailVerificationToken);

      return createdUser;
    });

    return result;
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 400) {
      logger.warn('Validation or Conflict Error:', error.message);
      throw error;
    }

    if (error instanceof AppError) {
      logger.warn('Service Error:', error.message);
      throw error;
    }

    logger.error('Unexpected Service Error:', error);
    throw new AppError('Service Error: Failed to register user', 500);
  }
};

const signToken = async (
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
