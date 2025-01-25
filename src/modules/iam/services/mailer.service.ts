import { AppError } from '@common/errors/http-status.error';
import logger from '@common/log/app.log';
import { sendEmail } from '@common/utils/email.util';
import getEnvVariable from '@common/utils/env.util';
import { User } from '@modules/iam/entities/user.entity';

export const sendEmailVerification = async (
  email: User['email'],
  token: string,
): Promise<void> => {
  try {
    const verificationLink = new URL(
      'auth/verify-email',
      getEnvVariable('FRONTEND_URL'),
    );
    verificationLink.search = new URLSearchParams({ token }).toString();

    const html = `
      <h1>Verify Your Email Address</h1>
      <p>Thank you for registering. Please verify your email address by clicking the link below:</p>
      <a href="${verificationLink}" target="_blank">Verify Email</a>
      <p>If you did not register, please ignore this email.</p>
    `;

    await sendEmail(
      email,
      'Email Verification - Complete Your Registration',
      html,
    );
  } catch (error) {
    logger.error('Error sending email verification:', error);
    throw new AppError('Failed to send email verification.', 500, false);
  }
};
