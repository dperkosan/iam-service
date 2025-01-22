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

  beforeEach(() => {
    const env = {
      SMTP_HOST: 'smtp.test.com',
      SMTP_PORT: '587',
      SMTP_USER: 'user@example.com',
      SMTP_PASS: 'password',
      SMTP_FROM: 'sender@example.com',
    };

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

  it('should send an email successfully with the correct details', async () => {
    mockTransporter.sendMail.mockResolvedValueOnce({ messageId: '12345' });

    const to = 'recipient@example.com';
    const subject = 'Test Email';
    const html = '<p>This is a test email</p>';

    const result = await sendEmail(to, subject, html);

    expect(mockTransporter.sendMail).toHaveBeenCalledWith({
      from: 'sender@example.com',
      to,
      subject,
      html,
    });
    expect(result).toEqual({ messageId: '12345' });
    expect(logger.info).toHaveBeenCalledWith('Email sent: 12345');
  });

  it('should throw an Error if sending email fails', async () => {
    const error = new Error('SMTP error');
    mockTransporter.sendMail.mockRejectedValueOnce(error);

    const to = 'recipient@example.com';
    const subject = 'Test Email';
    const html = '<p>This is a test email</p>';

    await expect(sendEmail(to, subject, html)).rejects.toThrow('SMTP error');
    expect(logger.error).toHaveBeenCalledWith('Error sending email:', error);
  });

  it('should use correct SMTP configuration from environment variables', async () => {
    const to = 'recipient@example.com';
    const subject = 'Test Email';
    const html = '<p>This is a test email</p>';

    mockTransporter.sendMail.mockResolvedValueOnce({ messageId: '12345' });

    await sendEmail(to, subject, html);

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
