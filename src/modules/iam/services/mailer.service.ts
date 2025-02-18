import { AppError } from '@common/errors/http-status.error';
import logger from '@common/log/app.log';
import { sendEmail } from '@common/utils/email.util';
import getEnvVariable from '@common/utils/env.util';
import { User } from '@modules/iam/entities/user.entity';

export const sendVerifyAccountEmail = async (
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

export const sendWelcomeMail = async (email: User['email']): Promise<void> => {
  try {
    const loginLink = new URL('auth/login', getEnvVariable('FRONTEND_URL'));

    const html = `
      <h1>Your Email Has Been Verified</h1>
      <p>Congratulations! Your email address has been successfully verified.</p>
      <p>You can now access all features of your account. Click the link below to log in:</p>
      <a href="${loginLink}" target="_blank">Go to Login</a>
      <p>If you did not verify this email, please contact our support team.</p>
    `;

    await sendEmail(email, 'Account Verified - Welcome!', html);
  } catch (error) {
    logger.error('Error sending welcome mail:', error);
    throw new AppError('Failed to send welcome mail.', 500, false);
  }
};

export const sendResetPasswordEmail = async (
  email: User['email'],
  token: string,
): Promise<void> => {
  try {
    const resetLink = new URL(
      'auth/reset-password',
      getEnvVariable('FRONTEND_URL'),
    );
    resetLink.search = new URLSearchParams({ token }).toString();

    const html = `
      <h1>Reset Your Password</h1>
      <p>You requested to reset your password. Click the link below to set a new password:</p>
      <a href="${resetLink}" target="_blank">Reset Password</a>
      <p>If you did not request this change, please ignore this email.</p>
    `;

    await sendEmail(email, 'Password Reset Request', html);
  } catch (error) {
    logger.error('Error sending password reset email:', error);
    throw new AppError('Failed to send password reset email.', 500, false);
  }
};
