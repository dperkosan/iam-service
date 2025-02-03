import nodemailer from 'nodemailer';
import logger from '@common/log/app.log';
import getEnvVariable from '@common/utils/env.util';

/**
 * Creates a new Nodemailer transporter instance with SMTP settings.
 */
export const createTransporter = () => {
  const transporter = nodemailer.createTransport({
    host: getEnvVariable('SMTP_HOST'),
    port: parseInt(getEnvVariable('SMTP_PORT'), 10),
    auth: {
      user: getEnvVariable('SMTP_USER'),
      pass: getEnvVariable('SMTP_PASS'),
    },
  });

  // Event listeners for logging
  transporter.on('idle', () => logger.info('SMTP Transporter is idle.'));
  transporter.on('error', (error) =>
    logger.error('SMTP Transporter error:', error),
  );

  return transporter;
};

/**
 * Sends an email using the configured SMTP transporter.
 *
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - HTML content of the email
 * @returns {Promise<{ messageId: string }>} - The messageId of the sent email
 */
export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
): Promise<{ messageId: string }> => {
  // **Input Validation**
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    throw new Error('Invalid email address');
  }

  if (!subject || typeof subject !== 'string') {
    throw new Error('Email subject cannot be empty');
  }

  if (!html || typeof html !== 'string') {
    throw new Error('Email content cannot be empty');
  }

  const transporter = createTransporter();

  try {
    const info = await transporter.sendMail({
      from: getEnvVariable('SMTP_FROM'),
      to,
      subject,
      html,
    });

    logger.info(
      `Email sent successfully to ${to} (Message ID: ${info.messageId})`,
    );
    return { messageId: info.messageId };
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error);
    throw error;
  }
};
