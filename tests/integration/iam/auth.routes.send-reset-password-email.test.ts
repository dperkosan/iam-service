import request from 'supertest';
import nodemailer from 'nodemailer';
import { createApp } from 'src/createApp';
import dataSource from '@database/config/typeorm.config';
import { redisClient } from '@redis/redis.client';
import clearDB from '@database/clear-db';
import { userMockFactory } from '@modules/iam/mocks/user.mock';
import { User } from '@modules/iam/entities/user.entity';
import { organizationMockFactory } from '@modules/organizations/mocks/organization.mock';
import { Organization } from '@modules/organizations/entities/organization.entity';
import { SendEmailDto } from '@modules/iam/dtos/send-email.dto';
import * as mailerService from '@modules/iam/services/mailer.service';

const app = createApp();

describe('Send Reset Password Email Integration Test', () => {
  let sendMailMock: jest.Mock;
  let organization: Organization;
  let user: User;

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    await redisClient.ping();

    sendMailMock = jest
      .fn()
      .mockResolvedValue({ messageId: 'test-message-id' });

    jest.spyOn(nodemailer, 'createTransport').mockReturnValue({
      sendMail: sendMailMock,
      on: jest.fn(),
    } as unknown as jest.Mocked<nodemailer.Transporter>);
  });

  afterAll(async () => {
    await clearDB(dataSource);
    await redisClient.flushall();
    await dataSource.destroy();
    await redisClient.quit();
  });

  beforeEach(async () => {
    await clearDB(dataSource);
    await redisClient.flushall();

    organization = organizationMockFactory();
    await dataSource.manager.save(Organization, organization);

    user = userMockFactory({
      organization: organization,
    });
    await dataSource.manager.save(User, user);
  });

  it('should send reset password email successfully', async () => {
    const requestBody: SendEmailDto = {
      email: user.email,
      organizationId: user.organizationId,
    };

    const response = await request(app)
      .post('/auth/send-reset-password-email')
      .send(requestBody)
      .expect(200);

    expect(response.body).toBe('Email sent successfully');
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: user.email }),
    );
  });

  it('should return success response even if user does not exist', async () => {
    await dataSource.manager.delete(User, user.id);

    const requestBody: SendEmailDto = {
      email: user.email,
      organizationId: user.organizationId,
    };

    const response = await request(app)
      .post('/auth/send-reset-password-email')
      .send(requestBody)
      .expect(200);

    expect(response.body).toEqual({});
  });

  it('should handle token insertion failures gracefully', async () => {
    jest
      .spyOn(redisClient, 'set')
      .mockRejectedValueOnce(new Error('Redis error'));

    const requestBody: SendEmailDto = {
      email: user.email,
      organizationId: user.organizationId,
    };

    const response = await request(app)
      .post('/auth/send-reset-password-email')
      .send(requestBody)
      .expect(500);

    expect(response.body.message).toBe('Service Error: Failed to insert token');
    jest.restoreAllMocks();
  });

  it('should handle unexpected email service errors gracefully', async () => {
    jest
      .spyOn(mailerService, 'sendResetPasswordEmail')
      .mockRejectedValueOnce(new Error('Email service down'));

    const requestBody: SendEmailDto = {
      email: user.email,
      organizationId: user.organizationId,
    };

    const response = await request(app)
      .post('/auth/send-reset-password-email')
      .send(requestBody)
      .expect(500);

    expect(response.body.message).toBe('Service Error: Failed to send email');
  });
});
