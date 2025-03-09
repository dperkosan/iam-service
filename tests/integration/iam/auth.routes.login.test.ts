import request from 'supertest';
import { createApp } from 'src/createApp';
import dataSource from '@database/config/typeorm.config';
import { redisClient } from '@redis/redis.client';
import clearDB from '@database/clear-db';
import { userMockFactory } from '@modules/iam/mocks/user.mock';
import { Organization } from '@modules/organizations/entities/organization.entity';
import { organizationMockFactory } from '@modules/organizations/mocks/organization.mock';
import { User } from '@modules/iam/entities/user.entity';
import getEnvVariable from '@common/utils/env.util';

const app = createApp();
const validApiKey = getEnvVariable('IAM_SERVICE_API_KEY');
const invalidApiKey = 'invalid-api-key';

describe('Login Integration Test', () => {
  let organization: Organization;
  let user: User;

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    await redisClient.ping();
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
      password: 'password123',
      organization: organization,
    });

    await dataSource.manager.save(User, user);
  });

  it('should login successfully and return access tokens', async () => {
    const response = await request(app)
      .post('/auth/login')
      .set('x-api-key', validApiKey)
      .send({
        email: user.email,
        password: 'password123',
        organizationId: user.organizationId,
      })
      .expect(200);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
    expect(typeof response.body.accessToken).toBe('string');
    expect(typeof response.body.refreshToken).toBe('string');
  });

  it('should fail when credentials are invalid', async () => {
    const response = await request(app)
      .post('/auth/login')
      .set('x-api-key', validApiKey)
      .send({
        email: 'wrong@example.com',
        password: 'wrongpassword',
        organizationId: user.organizationId,
      })
      .expect(401);

    expect(response.body).toHaveProperty(
      'message',
      'User credentials are invalid.',
    );
  });

  it('should fail when user account is not enabled', async () => {
    await dataSource.manager.update(User, user.id, { enabled: false });

    const response = await request(app)
      .post('/auth/login')
      .set('x-api-key', validApiKey)
      .send({
        email: user.email,
        password: 'password123',
        organizationId: user.organizationId,
      })
      .expect(401);

    expect(response.body).toHaveProperty(
      'message',
      'User account is not enabled.',
    );
  });

  it('should fail when user email is not verified', async () => {
    await dataSource.manager.update(User, user.id, { emailVerified: false });

    const response = await request(app)
      .post('/auth/login')
      .set('x-api-key', validApiKey)
      .send({
        email: user.email,
        password: 'password123',
        organizationId: user.organizationId,
      })
      .expect(401);

    expect(response.body).toHaveProperty(
      'message',
      'User email is not verified.',
    );
  });

  it('should fail when API key is missing', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: user.email,
        password: 'password123',
        organizationId: user.organizationId,
      })
      .expect(403); // Expect Forbidden

    expect(response.body).toHaveProperty(
      'message',
      'Forbidden: Invalid API key',
    );
  });

  it('should fail when API key is invalid', async () => {
    const response = await request(app)
      .post('/auth/login')
      .set('x-api-key', invalidApiKey) // Invalid API key
      .send({
        email: user.email,
        password: 'password123',
        organizationId: user.organizationId,
      })
      .expect(403); // Expect Forbidden

    expect(response.body).toHaveProperty(
      'message',
      'Forbidden: Invalid API key',
    );
  });
});
