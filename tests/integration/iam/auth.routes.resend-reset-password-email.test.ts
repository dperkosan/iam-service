import request from 'supertest';
import nodemailer from 'nodemailer';
import { createApp } from 'src/createApp';
import dataSource from '@database/config/typeorm.config';
import { redisClient } from '@redis/redis.client';
import clearDB from '@database/clear-db';
import { userMockFactory } from '@modules/iam/mocks/user.mock';
import { User } from '@modules/iam/entities/user.entity';
import { randomUUID } from 'crypto';
import { insertToken, signToken } from '@modules/iam/services/token.service';
import { TokenType } from '@modules/iam/enums/token-type.enum';
import { Organization } from '@modules/organizations/entities/organization.entity';
import { organizationMockFactory } from '@modules/organizations/mocks/organization.mock';
import getEnvVariable from '@common/utils/env.util';

const app = createApp();
const validApiKey = getEnvVariable('IAM_SERVICE_API_KEY');
const invalidApiKey = 'invalid-api-key';

describe('Resend Reset Password Email Integration Test', () => {
  let sendMailMock: jest.Mock;
  let organization: Organization;
  let user: User;
  let tokenId: string;
  let validToken: string;

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

    tokenId = randomUUID();
    validToken = await signToken(
      user.id,
      TokenType.FORGOTTEN_PASSWORD,
      Number(process.env.forgottenPasswordTokenTtl) || 3600,
      { tokenId },
    );
    await insertToken(user.id, TokenType.FORGOTTEN_PASSWORD, tokenId, 3600);
  });

  it('should resend reset password email successfully', async () => {
    const response = await request(app)
      .post('/auth/resend-reset-password-email')
      .set('x-api-key', validApiKey)
      .send({ token: validToken })
      .expect(200);

    expect(response.body).toBe('Email sent successfully');

    const redisKeys = await redisClient.keys('*');
    expect(redisKeys.length).toBe(1);
    const newTokenId = await redisClient.get(redisKeys[0]);
    expect(newTokenId).toBeDefined();
    expect(typeof newTokenId).toBe('string');
    expect(newTokenId).not.toBe(tokenId);

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: user.email }),
    );
  });

  it('should fail when user does not exist', async () => {
    await dataSource.manager.delete(User, user.id);

    const response = await request(app)
      .post('/auth/resend-reset-password-email')
      .set('x-api-key', validApiKey)
      .send({ token: validToken })
      .expect(404);

    expect(response.body.message).toBe('User not found');
  });

  it('should fail when token is revoked', async () => {
    await redisClient.flushall();

    const response = await request(app)
      .post('/auth/resend-reset-password-email')
      .set('x-api-key', validApiKey)
      .send({ token: validToken })
      .expect(401);

    expect(response.body.message).toBe('Token has been revoked or is invalid');
  });

  it('should fail when token is invalid', async () => {
    const response = await request(app)
      .post('/auth/resend-reset-password-email')
      .set('x-api-key', validApiKey)
      .send({ token: 'invalid-token' })
      .expect(401);

    expect(response.body.message).toBe(
      'Unauthorized: Invalid or expired token',
    );
  });

  it('should handle unexpected service errors gracefully', async () => {
    jest
      .spyOn(redisClient, 'get')
      .mockRejectedValueOnce(new Error('Redis error'));

    const response = await request(app)
      .post('/auth/resend-reset-password-email')
      .set('x-api-key', validApiKey)
      .send({ token: validToken })
      .expect(500);

    expect(response.body.message).toBe(
      'Service Error: Failed to validate token',
    );
    jest.restoreAllMocks();
  });

  it('should return an error when API key is missing', async () => {
    const response = await request(app)
      .post('/auth/resend-reset-password-email')
      .send({ token: validToken })
      .expect(403);

    expect(response.body).toHaveProperty(
      'message',
      'Forbidden: Invalid API key',
    );
  });

  it('should return an error when API key is invalid', async () => {
    const response = await request(app)
      .post('/auth/resend-reset-password-email')
      .set('x-api-key', invalidApiKey)
      .send({ token: validToken })
      .expect(403);

    expect(response.body).toHaveProperty(
      'message',
      'Forbidden: Invalid API key',
    );
  });
});
