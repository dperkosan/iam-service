import nodemailer from 'nodemailer';
import logger from '@common/log/app.log';
import getEnvVariable from '@common/utils/env.util';

export const sendEmail = async (to: string, subject: string, html: string) => {
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    throw new Error('Invalid email address');
  }

  if (!subject || typeof subject !== 'string') {
    throw new Error('Email subject cannot be empty');
  }

  if (!html || typeof html !== 'string') {
    throw new Error('Email content cannot be empty');
  }

  try {
    const transporter = nodemailer.createTransport({
      host: getEnvVariable('SMTP_HOST'),
      port: parseInt(getEnvVariable('SMTP_PORT'), 10),
      auth: {
        user: getEnvVariable('SMTP_USER'),
        pass: getEnvVariable('SMTP_PASS'),
      },
    });

    const info = await transporter.sendMail({
      from: getEnvVariable('SMTP_FROM'),
      to,
      subject,
      html,
    });

    logger.info(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error('Error sending email:', error);
    throw error;
  }
};
