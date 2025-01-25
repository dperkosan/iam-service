import nodemailer from 'nodemailer';
import logger from '@common/log/app.log';
import { sendEmail } from '@common/utils/email.util';
import getEnvVariable from '@common/utils/env.util';

jest.mock('nodemailer');
jest.mock('@common/log/app.log');
jest.mock('@common/utils/env.util');

describe('sendEmail', () => {
  const mockTransporter = {
    sendMail: jest.fn(),
  };

  const env = {
    SMTP_HOST: 'smtp.test.com',
    SMTP_PORT: '587',
    SMTP_USER: 'user@example.com',
    SMTP_PASS: 'password',
    SMTP_FROM: 'sender@example.com',
  };

  beforeEach(() => {
    (getEnvVariable as jest.Mock).mockImplementation(
      (key: keyof typeof env) => {
        return env[key];
      },
    );

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when sending an email successfully', () => {
    it('should send an email with the correct details and return the result', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValueOnce({ messageId: '12345' });
      const to = 'recipient@example.com';
      const subject = 'Test Email';
      const html = '<p>This is a test email</p>';

      // Act
      const result = await sendEmail(to, subject, html);

      // Assert
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'sender@example.com',
        to,
        subject,
        html,
      });
      expect(result).toEqual({ messageId: '12345' });
      expect(logger.info).toHaveBeenCalledWith('Email sent: 12345');
    });
  });

  describe('when sending an email fails', () => {
    it('should log the error and throw an Error', async () => {
      // Arrange
      const error = new Error('SMTP error');
      mockTransporter.sendMail.mockRejectedValueOnce(error);
      const to = 'recipient@example.com';
      const subject = 'Test Email';
      const html = '<p>This is a test email</p>';

      // Act & Assert
      await expect(sendEmail(to, subject, html)).rejects.toThrow('SMTP error');
      expect(logger.error).toHaveBeenCalledWith('Error sending email:', error);
    });
  });

  describe('when using environment variables for SMTP configuration', () => {
    it('should use the correct SMTP configuration', async () => {
      // Arrange
      const to = 'recipient@example.com';
      const subject = 'Test Email';
      const html = '<p>This is a test email</p>';
      mockTransporter.sendMail.mockResolvedValueOnce({ messageId: '12345' });

      // Act
      await sendEmail(to, subject, html);

      // Assert
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.test.com',
        port: 587,
        auth: {
          user: 'user@example.com',
          pass: 'password',
        },
      });
    });
  });

  describe('when invalid arguments are provided', () => {
    it('should throw an error if "to" is empty', async () => {
      // Arrange
      const to = '';
      const subject = 'Test Email';
      const html = '<p>This is a test email</p>';

      // Act & Assert
      await expect(sendEmail(to, subject, html)).rejects.toThrow(
        'Invalid email address',
      );
    });

    it('should throw an error if "subject" is empty', async () => {
      // Arrange
      const to = 'recipient@example.com';
      const subject = '';
      const html = '<p>This is a test email</p>';

      // Act & Assert
      await expect(sendEmail(to, subject, html)).rejects.toThrow(
        'Email subject cannot be empty',
      );
    });

    it('should throw an error if "html" is empty', async () => {
      // Arrange
      const to = 'recipient@example.com';
      const subject = 'Test Email';
      const html = '';

      // Act & Assert
      await expect(sendEmail(to, subject, html)).rejects.toThrow(
        'Email content cannot be empty',
      );
    });
  });
});
