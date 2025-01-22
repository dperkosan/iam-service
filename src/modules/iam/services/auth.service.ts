import { RegisterDto } from '@modules/iam/dtos/register.dto';
import * as userRepository from '@modules/iam/repositories/user.repository';
import { AppError } from '@common/errors/http-status.error';
import logger from '@common/log/app.log';
import { hashData } from '@common/utils/hash.util';
import dataSource from '@database/config/typeorm.config';
import { randomUUID } from 'crypto';
import { TokenType } from '@modules/iam/enums/token-type.enum';
import jwtConfig from '@common/config/jwt.config';
import { insertToken, signToken } from '@modules/iam/services/token.service';
import { sendEmailVerification } from '@modules/iam/services/mailer.service';

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

      await insertToken(
        createdUser.id,
        TokenType.EMAIL_VERIFICATION,
        tokenId,
        jwtConfig.emailVerificationTokenTtl,
      );

      await sendEmailVerification(createdUser.email, emailVerificationToken);

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
