import { RegisterDto } from '@modules/iam/dtos/register.dto';
import { userRepository } from '@modules/iam/repositories/user.repository';
import {
  AppError,
  BadRequestError,
  TokenRevokedError,
  UnauthorizedError,
} from '@common/errors/http-status.error';
import logger from '@common/log/app.log';
import { hashData } from '@common/utils/hash.util';
import dataSource from '@database/config/typeorm.config';
import { randomUUID } from 'crypto';
import { TokenType } from '@modules/iam/enums/token-type.enum';
import jwtConfig from '@common/config/jwt.config';
import {
  insertToken,
  signToken,
  validateToken,
  verifyToken,
} from '@modules/iam/services/token.service';
import { sendEmailVerification } from '@modules/iam/services/mailer.service';
import { ResendEmailWithTokenDto } from '@modules/iam/dtos/resend-email-with-token.dto';
import { EntityNotFoundError } from 'typeorm';
import { createUserInTransaction } from '@modules/iam/repositories/user.repository.transaction';

export const register = async (registerDto: RegisterDto) => {
  try {
    const result = await dataSource.transaction(async (transactionManager) => {
      const hashedPassword = await hashData(registerDto.password);

      const userToCreate = { ...registerDto, password: hashedPassword };

      const createdUser = await createUserInTransaction(
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

      await insertToken(
        createdUser.id,
        TokenType.EMAIL_VERIFICATION,
        tokenId,
        jwtConfig.emailVerificationTokenTtl,
      );

      await sendEmailVerification(createdUser.email, emailVerificationToken);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = createdUser;

      return userWithoutPassword;
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

export const resendVerifyAccountEmail = async (
  resendEmailWithTokenDto: ResendEmailWithTokenDto,
) => {
  try {
    const { sub, tokenId } = await verifyToken(resendEmailWithTokenDto.token);

    const user = await userRepository.findOneByOrFail({ id: sub });

    if (user.emailVerified) {
      throw new BadRequestError('Email is already verified.');
    }

    await validateToken(user.id, TokenType.EMAIL_VERIFICATION, tokenId);

    // create new token
    const newTokenId = randomUUID();
    const newEmailVerificationToken = await signToken(
      user.id,
      TokenType.EMAIL_VERIFICATION,
      jwtConfig.emailVerificationTokenTtl,
      { tokenId: newTokenId },
    );

    // save new token in redis in place of old one
    await insertToken(
      user.id,
      TokenType.EMAIL_VERIFICATION,
      newTokenId,
      jwtConfig.emailVerificationTokenTtl,
    );

    // resend email
    await sendEmailVerification(user.email, newEmailVerificationToken);

    return 'Email resent successfully';
  } catch (error) {
    if (error instanceof EntityNotFoundError) {
      throw new AppError('User not found', 404);
    }

    if (error instanceof TokenRevokedError) {
      logger.warn('Unauthorized attempt with a revoked token');
      throw error;
    }

    if (error instanceof UnauthorizedError) {
      logger.warn('Unauthorized attempt with an invalid/expired token');
      throw error;
    }

    if (error instanceof AppError) {
      logger.warn('Service Error:', error.message);
      throw error;
    }

    logger.error('Unexpected Service Error:', error);
    throw new AppError('Service Error: Failed to resend email', 500);
  }
};
