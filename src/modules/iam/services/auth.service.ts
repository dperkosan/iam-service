import { RegisterDto } from '@modules/iam/dtos/register.dto';
import { userRepository } from '@modules/iam/repositories/user.repository';
import {
  AppError,
  BadRequestError,
  TokenRevokedError,
  UnauthorizedError,
} from '@common/errors/http-status.error';
import logger from '@common/log/app.log';
import { compareData, hashData } from '@common/utils/hash.util';
import dataSource from '@database/config/typeorm.config';
import { randomUUID } from 'crypto';
import { TokenType } from '@modules/iam/enums/token-type.enum';
import jwtConfig from '@common/config/jwt.config';
import {
  generateAccessTokens,
  insertToken,
  invalidateToken,
  signToken,
  validateToken,
  verifyToken,
} from '@modules/iam/services/token.service';
import {
  sendEmailVerification,
  sendWelcomeMail,
} from '@modules/iam/services/mailer.service';
import { ResendEmailWithTokenDto } from '@modules/iam/dtos/resend-email-with-token.dto';
import { EntityNotFoundError } from 'typeorm';
import { createUserInTransaction } from '@modules/iam/repositories/user.repository.transaction';
import { SendEmailDto } from '@modules/iam/dtos/send-email.dto';
import { VerifyAccountDto } from '@modules/iam/dtos/verify-account.dto';
import { LoginDto } from '@modules/iam/dtos/login.dto';
import { RefreshTokenDto } from '@modules/iam/dtos/refresh-token.dto';

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

    return 'Email sent successfully';
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
    throw new AppError('Service Error: Failed to send email', 500);
  }
};

export const sendVerifyAccountEmail = async (sendEmailDto: SendEmailDto) => {
  try {
    const user = await userRepository.findOneBy({
      email: sendEmailDto.email,
      organizationId: sendEmailDto.organizationId,
    });

    // Prevent user enumeration by returning success even if the user doesn't exist
    if (!user) return {};

    if (user.emailVerified) {
      throw new BadRequestError('Email is already verified.');
    }

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

    // send email
    await sendEmailVerification(user.email, newEmailVerificationToken);

    return 'Email sent successfully';
  } catch (error) {
    if (error instanceof AppError) {
      logger.warn('Service Error:', error.message);
      throw error;
    }

    logger.error('Unexpected Service Error:', error);
    throw new AppError('Service Error: Failed to send email', 500);
  }
};

export const verifyAccount = async (verifyAccountDto: VerifyAccountDto) => {
  try {
    const { sub, tokenId } = await verifyToken(verifyAccountDto.token);

    const user = await userRepository.findOneByOrFail({ id: sub });

    if (user.emailVerified) {
      throw new BadRequestError('Email is already verified.');
    }

    await validateToken(user.id, TokenType.EMAIL_VERIFICATION, tokenId);
    await invalidateToken(user.id, TokenType.EMAIL_VERIFICATION);
    await userRepository.update(user.id, { emailVerified: true });

    await sendWelcomeMail(user.email);

    return 'Account is successfully verified!';
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
    throw new AppError('Service Error: Failed to verify account', 500);
  }
};

export const login = async (loginDto: LoginDto) => {
  try {
    const user = await userRepository.findOneByOrFail({
      email: loginDto.email,
      organizationId: loginDto.organizationId,
    });

    const isCorrectPassword = await compareData(
      loginDto.password,
      user.password,
    );
    if (!isCorrectPassword) {
      throw new UnauthorizedError('User credentials are invalid.');
    }

    if (!user.enabled)
      throw new UnauthorizedError('User account is not enabled.');

    if (!user.emailVerified)
      throw new UnauthorizedError('User email is not verified.');

    return await generateAccessTokens(
      user.id,
      user.organizationId,
      user.email,
      user.role,
    );
  } catch (error) {
    if (error instanceof EntityNotFoundError) {
      logger.warn('User not found');
      throw new UnauthorizedError('User credentials are invalid.');
    }

    if (error instanceof UnauthorizedError) {
      logger.warn(error.message);
      throw error;
    }

    if (error instanceof AppError) {
      logger.warn('Service Error:', error.message);
      throw error;
    }

    logger.error('Unexpected Service Error:', error);
    throw new AppError('Service Error: Failed to login', 500);
  }
};

export const refreshToken = async (refreshTokenDto: RefreshTokenDto) => {
  try {
    const { sub, tokenId } = await verifyToken(refreshTokenDto.refreshToken);

    const user = await userRepository.findOneByOrFail({ id: sub });

    await validateToken(user.id, TokenType.REFRESH, tokenId);
    await invalidateToken(user.id, TokenType.REFRESH);

    return await generateAccessTokens(
      user.id,
      user.organizationId,
      user.email,
      user.role,
    );
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
    throw new AppError('Service Error: Failed to verify account', 500);
  }
};
