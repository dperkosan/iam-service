import request from 'supertest';
import nodemailer from 'nodemailer';
import { createApp } from 'src/createApp';
import dataSource from '@database/config/typeorm.config';
import { redisClient } from '@redis/redis.client';
import clearDB from '@database/clear-db';
import { userMockFactory } from '@modules/iam/mocks/user.mock';
import { Organization } from '@modules/organizations/entities/organization.entity';
import { organizationMockFactory } from '@modules/organizations/mocks/organization.mock';
import { User } from '@modules/iam/entities/user.entity';
import { TokenType } from '@modules/iam/enums/token-type.enum';
import { insertToken, signToken } from '@modules/iam/services/token.service';
import jwtConfig from '@common/config/jwt.config';

const app = createApp();

describe('Verify Account Integration Test', () => {
  let organization: Organization;
  let user: User;
  let sendMailMock: jest.Mock;
  let emailVerificationToken: string;
  let tokenId: string;

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
      emailVerified: false,
    });

    // Save the user after ensuring organization exists
    await dataSource.manager.save(User, user);

    tokenId = crypto.randomUUID();
    emailVerificationToken = await signToken(
      user.id,
      TokenType.EMAIL_VERIFICATION,
      jwtConfig.emailVerificationTokenTtl,
      { tokenId },
    );
    await insertToken(
      user.id,
      TokenType.EMAIL_VERIFICATION,
      tokenId,
      jwtConfig.emailVerificationTokenTtl,
    );
  });

  it('should verify an account successfully', async () => {
    const response = await request(app)
      .patch('/auth/verify-account')
      .send({ token: emailVerificationToken })
      .expect(200);

    expect(response.body).toBe('Account is successfully verified!');

    const updatedUser = await dataSource
      .getRepository(User)
      .findOne({ where: { id: user.id } });
    expect(updatedUser).toBeDefined();
    expect(updatedUser!.emailVerified).toBe(true);

    const redisKeys = await redisClient.keys('*');
    expect(redisKeys.length).toBe(0);
  });

  it('should return an error for an invalid token', async () => {
    const response = await request(app)
      .patch('/auth/verify-account')
      .send({ token: 'invalid-token' })
      .expect(401);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe(
      'Unauthorized: Invalid or expired token',
    );
  });

  it('should return an error if user is already verified', async () => {
    await dataSource
      .getRepository(User)
      .update(user.id, { emailVerified: true });

    const response = await request(app)
      .patch('/auth/verify-account')
      .send({ token: emailVerificationToken })
      .expect(400);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe('Email is already verified.');
  });

  it('should return an error if user does not exist', async () => {
    await dataSource.getRepository(User).delete(user.id);

    const response = await request(app)
      .patch('/auth/verify-account')
      .send({ token: emailVerificationToken })
      .expect(404);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe('User not found');
  });
});
