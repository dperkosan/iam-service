import request from 'supertest';
import { createApp } from 'src/createApp';
import dataSource from '@database/config/typeorm.config';
import { redisClient } from '@redis/redis.client';
import clearDB from '@database/clear-db';
import { userMockFactory } from '@modules/iam/mocks/user.mock';
import { User } from '@modules/iam/entities/user.entity';
import { organizationMockFactory } from '@modules/organizations/mocks/organization.mock';
import { Organization } from '@modules/organizations/entities/organization.entity';
import { TokenType } from '@modules/iam/enums/token-type.enum';
import {
  signToken,
  insertToken,
  invalidateToken,
} from '@modules/iam/services/token.service';
import jwtConfig from '@common/config/jwt.config';
import { randomUUID } from 'crypto';
import getEnvVariable from '@common/utils/env.util';

const app = createApp();
const validApiKey = getEnvVariable('IAM_SERVICE_API_KEY');
const invalidApiKey = 'invalid-api-key';

describe('Reset Password Integration Test', () => {
  let organization: Organization;
  let user: User;
  let tokenId: string;
  let validToken: string;

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
      organization: organization,
      emailVerified: false,
    });
    await dataSource.manager.save(User, user);

    tokenId = randomUUID();
    validToken = await signToken(
      user.id,
      TokenType.FORGOTTEN_PASSWORD,
      jwtConfig.forgottenPasswordTokenTtl,
      { tokenId },
    );
    await insertToken(
      user.id,
      TokenType.FORGOTTEN_PASSWORD,
      tokenId,
      jwtConfig.forgottenPasswordTokenTtl,
    );
  });

  it('should reset password successfully', async () => {
    const requestBody = {
      token: validToken,
      newPassword: 'newStrongPassword123',
    };

    const response = await request(app)
      .patch('/auth/reset-password')
      .set('x-api-key', validApiKey)
      .send(requestBody)
      .expect(200);

    expect(response.body).toBe('Password is successfully changed!');

    const updatedUser = await dataSource.manager.findOneBy(User, {
      id: user.id,
    });
    expect(updatedUser).not.toBeNull();
    expect(updatedUser?.password).not.toBe('oldPassword123');
  });

  it('should fail when token is invalid', async () => {
    const requestBody = {
      token: 'invalid-token',
      newPassword: 'newStrongPassword123',
    };

    const response = await request(app)
      .patch('/auth/reset-password')
      .set('x-api-key', validApiKey)
      .send(requestBody)
      .expect(401);

    expect(response.body.message).toBe(
      'Unauthorized: Invalid or expired token',
    );
  });

  it('should fail when token is revoked (not in Redis)', async () => {
    await invalidateToken(user.id, TokenType.FORGOTTEN_PASSWORD);

    const requestBody = {
      token: validToken,
      newPassword: 'newStrongPassword123',
    };

    const response = await request(app)
      .patch('/auth/reset-password')
      .set('x-api-key', validApiKey)
      .send(requestBody)
      .expect(401);

    expect(response.body.message).toBe('Token has been revoked or is invalid');
  });

  it('should fail when user does not exist', async () => {
    await dataSource.manager.delete(User, user.id);

    const requestBody = {
      token: validToken,
      newPassword: 'newStrongPassword123',
    };

    const response = await request(app)
      .patch('/auth/reset-password')
      .set('x-api-key', validApiKey)
      .send(requestBody)
      .expect(404);

    expect(response.body.message).toBe('User not found');
  });

  it('should handle unexpected errors gracefully', async () => {
    // Spy on the `get` method (or any method you expect to fail)
    const redisGetSpy = jest
      .spyOn(redisClient, 'get')
      .mockImplementation(() => {
        throw new Error('Simulated Redis failure');
      });

    const requestBody = {
      token: validToken,
      newPassword: 'newStrongPassword123',
    };

    const response = await request(app)
      .patch('/auth/reset-password')
      .set('x-api-key', validApiKey)
      .send(requestBody)
      .expect(500);

    expect(response.body.message).toContain(
      'Service Error: Failed to validate token',
    );

    redisGetSpy.mockRestore();
  });

  it('should return an error when API key is missing', async () => {
    const requestBody = {
      token: validToken,
      newPassword: 'newStrongPassword123',
    };

    const response = await request(app)
      .patch('/auth/reset-password')
      .send(requestBody)
      .expect(403);

    expect(response.body).toHaveProperty(
      'message',
      'Forbidden: Invalid API key',
    );
  });

  it('should return an error when API key is invalid', async () => {
    const requestBody = {
      token: validToken,
      newPassword: 'newStrongPassword123',
    };

    const response = await request(app)
      .patch('/auth/reset-password')
      .set('x-api-key', invalidApiKey)
      .send(requestBody)
      .expect(403);

    expect(response.body).toHaveProperty(
      'message',
      'Forbidden: Invalid API key',
    );
  });
});
