import { sendEmail } from '@common/utils/email.util';
import logger from '@common/log/app.log';
import { AppError } from '@common/errors/http-status.error';
import { sendEmailVerification } from '@modules/iam/services/mailer.service';
import getEnvVariable from '@common/utils/env.util';

jest.mock('@common/utils/email.util', () => ({
  sendEmail: jest.fn(),
}));

jest.mock('@common/log/app.log', () => ({
  error: jest.fn(),
}));

jest.mock('@common/utils/env.util', () => jest.fn());

describe('Email Service - sendEmailVerification', () => {
  const email = 'test@example.com';
  const token = 'mockToken';
  const frontendUrl = 'https://frontend.example.com';

  beforeAll(() => {
    (getEnvVariable as jest.Mock).mockImplementation((key: string) => {
      if (key === 'FRONTEND_URL') return frontendUrl;
      return undefined;
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe('when email is sent successfully', () => {
    it('should send an email with the correct parameters', async () => {
      // Act
      await sendEmailVerification(email, token);

      // Assert
      const expectedVerificationLink = new URL(
        'auth/verify-email',
        frontendUrl,
      );
      expectedVerificationLink.search = new URLSearchParams({
        token,
      }).toString();

      const expectedHtml = `
      <h1>Verify Your Email Address</h1>
      <p>Thank you for registering. Please verify your email address by clicking the link below:</p>
      <a href="${expectedVerificationLink}" target="_blank">Verify Email</a>
      <p>If you did not register, please ignore this email.</p>
    `;

      expect(sendEmail).toHaveBeenCalledWith(
        email,
        'Email Verification - Complete Your Registration',
        expectedHtml,
      );
    });
  });

  describe('when email sending fails', () => {
    it('should log the error and throw an AppError', async () => {
      // Arrange
      const mockError = new Error('SMTP Connection Error');
      (sendEmail as jest.Mock).mockRejectedValueOnce(mockError);

      // Act
      const promise = sendEmailVerification(email, token);

      // Assert
      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toThrow(
        'Failed to send email verification.',
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Error sending email verification:',
        mockError,
      );
    });
  });
});
