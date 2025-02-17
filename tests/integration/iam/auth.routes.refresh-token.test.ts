import request from 'supertest';
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

describe('Refresh Token Integration Test', () => {
  let organization: Organization;
  let user: User;
  let refreshToken: string;
  let tokenId: string;

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

    user = userMockFactory({ organization });
    await dataSource.manager.save(User, user);

    tokenId = crypto.randomUUID();
    refreshToken = await signToken(
      user.id,
      TokenType.REFRESH,
      jwtConfig.refreshTokenTtl,
      { tokenId },
    );
    await insertToken(
      user.id,
      TokenType.REFRESH,
      tokenId,
      jwtConfig.refreshTokenTtl,
    );
  });

  it('should refresh token successfully', async () => {
    const response = await request(app)
      .post('/auth/refresh-token')
      .send({ refreshToken })
      .expect(200);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
  });

  it('should return an error for invalid token', async () => {
    const response = await request(app)
      .post('/auth/refresh-token')
      .send({ refreshToken: 'invalid-token' })
      .expect(401);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe(
      'Unauthorized: Invalid or expired token',
    );
  });

  it('should return an error if user does not exist', async () => {
    await dataSource.getRepository(User).delete(user.id);

    const response = await request(app)
      .post('/auth/refresh-token')
      .send({ refreshToken })
      .expect(404);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe('User not found');
  });

  it('should return an error if token is revoked', async () => {
    await redisClient.del(`${TokenType.REFRESH}-user-${user.id}`);

    const response = await request(app)
      .post('/auth/refresh-token')
      .send({ refreshToken })
      .expect(401);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe('Token has been revoked or is invalid');
  });
});
