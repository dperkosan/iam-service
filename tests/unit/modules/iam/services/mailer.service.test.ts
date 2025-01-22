import { sendEmail } from '@common/utils/email.util';
import logger from '@common/log/app.log';
import { AppError } from '@common/errors/http-status.error';
import { sendEmailVerification } from '@modules/iam/services/mailer.service';

jest.mock('@common/utils/email.util', () => ({
  sendEmail: jest.fn(),
}));

jest.mock('@common/log/app.log', () => ({
  error: jest.fn(),
}));

describe('Email Service - sendEmailVerification', () => {
  const email = 'test@example.com';
  const token = 'mockToken';
  const frontendUrl = 'https://frontend.example.com';

  beforeAll(() => {
    process.env.FRONTEND_URL = frontendUrl;
  });

  afterAll(() => {
    delete process.env.FRONTEND_URL;
  });

  describe('when email is sent successfully', () => {
    it('should send an email with the correct parameters', async () => {
      await sendEmailVerification(email, token);

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
      const mockError = new Error('SMTP Connection Error');
      (sendEmail as jest.Mock).mockRejectedValueOnce(mockError);

      // Call sendEmailVerification once
      const promise = sendEmailVerification(email, token);

      // Assert that it rejects with AppError
      await expect(promise).rejects.toThrow(AppError);

      // Assert that the error message matches
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
