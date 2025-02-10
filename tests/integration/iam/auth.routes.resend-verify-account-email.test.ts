import request from 'supertest';
import nodemailer from 'nodemailer';
import { createApp } from 'src/createApp';
import dataSource from '@database/config/typeorm.config';
import { redisClient } from '@redis/redis.client';
import clearDB from '@database/clear-db';
import { userMock } from '@modules/iam/mocks/user.mock';
import { User } from '@modules/iam/entities/user.entity';
import { randomUUID } from 'crypto';
import { insertToken, signToken } from '@modules/iam/services/token.service';
import { TokenType } from '@modules/iam/enums/token-type.enum';
import { organizationMockFactory } from '@modules/organizations/mocks/organization.mock';
import { Organization } from '@modules/organizations/entities/organization.entity';
import { RegisterDto } from '@modules/iam/dtos/register.dto';
import { faker } from '@faker-js/faker/.';

const app = createApp();

describe('Resend Verify Account Email Integration Test', () => {
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
    await dataSource.destroy();
    await redisClient.quit();
  });

  beforeEach(async () => {
    await clearDB(dataSource);
    await redisClient.flushall();

    // Create an organization
    organization = organizationMockFactory();
    await dataSource.manager.save(Organization, organization);

    // Create a user
    const registerDto: RegisterDto = {
      firstName: userMock.firstName,
      lastName: userMock.lastName,
      email: userMock.email,
      password: faker.internet.password(),
      role: userMock.role,
      organizationId: organization.id,
    };

    user = dataSource.manager.create(User, registerDto);
    await dataSource.manager.save(User, user);

    tokenId = randomUUID();
    validToken = await signToken(
      user.id,
      TokenType.EMAIL_VERIFICATION,
      Number(process.env.emailVerificationTokenTtl) || 3600,
      {
        tokenId,
      },
    );
    await insertToken(user.id, TokenType.EMAIL_VERIFICATION, tokenId, 3600);
  });

  it('should resend verification email successfully', async () => {
    const response = await request(app)
      .post('/auth/resend-verify-account-email')
      .send({ token: validToken })
      .expect(200);

    expect(response.body).toBe('Email resent successfully');

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

  it('should fail when email is already verified', async () => {
    await dataSource.manager.update(User, user.id, { emailVerified: true });

    const response = await request(app)
      .post('/auth/resend-verify-account-email')
      .send({ token: validToken })
      .expect(400);

    expect(response.body.message).toBe('Email is already verified.');
  });

  it('should fail when user does not exist', async () => {
    await dataSource.manager.delete(User, user.id);

    const response = await request(app)
      .post('/auth/resend-verify-account-email')
      .send({ token: validToken })
      .expect(404);

    expect(response.body.message).toBe('User not found');
  });

  it('should fail when token is revoked', async () => {
    await redisClient.flushall();

    const response = await request(app)
      .post('/auth/resend-verify-account-email')
      .send({ token: validToken })
      .expect(401);

    expect(response.body.message).toBe('Token has been revoked or is invalid');
  });

  it('should fail when token is invalid', async () => {
    const response = await request(app)
      .post('/auth/resend-verify-account-email')
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
      .post('/auth/resend-verify-account-email')
      .send({ token: validToken })
      .expect(500);

    expect(response.body.message).toBe('Service Error: Failed to resend email');
    jest.restoreAllMocks();
  });
});
