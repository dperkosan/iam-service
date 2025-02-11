import request from 'supertest';
import nodemailer from 'nodemailer';
import { createApp } from 'src/createApp';
import dataSource from '@database/config/typeorm.config';
import { redisClient } from '@redis/redis.client';
import clearDB from '@database/clear-db';
import { RegisterDto } from '@modules/iam/dtos/register.dto';
import { userMock } from '@modules/iam/mocks/user.mock';
import { Organization } from '@modules/organizations/entities/organization.entity';
import { organizationMockFactory } from '@modules/organizations/mocks/organization.mock';
import { faker } from '@faker-js/faker/.';
import { User } from '@modules/iam/entities/user.entity';
import { compare } from 'bcrypt';

const app = createApp();

describe('Register Integration Test', () => {
  let organization: Organization;
  let sendMailMock: jest.Mock;

  beforeAll(async () => {
    // Initialize database and Redis
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

    // Cleanup database and Redis connections
    await dataSource.destroy();
    await redisClient.quit();
  });

  beforeEach(async () => {
    await clearDB(dataSource);
    await redisClient.flushall();

    // Create an organization
    organization = organizationMockFactory();
    await dataSource.manager.save(Organization, organization);
  });

  it('should register a user successfully, store email verification token in Redis and send verification email', async () => {
    const registerDto: RegisterDto = {
      firstName: userMock.firstName,
      lastName: userMock.lastName,
      email: userMock.email,
      password: faker.internet.password(),
      role: userMock.role,
      organizationId: organization.id,
    };

    const response = await request(app)
      .post('/auth/register')
      .send(registerDto)
      .expect(201);

    // Validate response data
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('email', registerDto.email);
    expect(response.body).toHaveProperty('firstName', registerDto.firstName);
    expect(response.body).toHaveProperty('lastName', registerDto.lastName);
    expect(response.body).toHaveProperty('role', registerDto.role);
    expect(response.body).toHaveProperty(
      'organizationId',
      registerDto.organizationId,
    );
    expect(response.body).toHaveProperty('emailVerified', false);
    expect(response.body).toHaveProperty('enabled', true);
    expect(response.body).not.toHaveProperty('password');
    expect(response.body).toHaveProperty('createdAt');
    expect(response.body).toHaveProperty('updatedAt');

    // Ensure `createdAt` and `updatedAt` are valid ISO 8601 timestamps
    expect(new Date(response.body.createdAt).toISOString()).toBe(
      response.body.createdAt,
    );
    expect(new Date(response.body.updatedAt).toISOString()).toBe(
      response.body.updatedAt,
    );

    // Ensure `createdAt` and `updatedAt` are close to now (within 2 seconds)
    const now = Date.now();
    const createdAtTimestamp = new Date(response.body.createdAt).getTime();
    const updatedAtTimestamp = new Date(response.body.updatedAt).getTime();

    expect(Math.abs(now - createdAtTimestamp)).toBeLessThan(2000);
    expect(Math.abs(now - updatedAtTimestamp)).toBeLessThan(2000);

    // Verify the stored password is actually hashed
    const userFromDb = await dataSource
      .getRepository(User) // Use your User entity
      .findOne({ where: { email: registerDto.email } });

    expect(userFromDb).toBeDefined();
    expect(userFromDb!.password).toBeDefined();

    const isPasswordHashed = await compare(
      registerDto.password,
      userFromDb!.password,
    );
    expect(isPasswordHashed).toBe(true);

    // Check if email verification tokenId exists in Redis
    const redisKeys = await redisClient.keys('*');
    expect(redisKeys.length).toBe(1);
    const tokenId = await redisClient.get(redisKeys[0]);
    expect(tokenId).toBeDefined();
    expect(typeof tokenId).toBe('string');
    expect(tokenId).toMatch(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    );

    // Verify that sendMail was called correctly
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: process.env.SMTP_FROM,
        to: registerDto.email,
        subject: expect.any(String),
        html: expect.any(String),
      }),
    );
  });

  it('should fail when email and organization ID already exist in the database', async () => {
    const registerDto: RegisterDto = {
      firstName: userMock.firstName,
      lastName: userMock.lastName,
      email: userMock.email,
      password: faker.internet.password(),
      role: userMock.role,
      organizationId: organization.id,
    };

    // Register the user for the first time
    await request(app).post('/auth/register').send(registerDto).expect(201);

    const response = await request(app)
      .post('/auth/register')
      .send(registerDto)
      .expect(400);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe('Email already exists');
  });

  it('should fail when input is invalid', async () => {
    const invalidRegisterDto = {
      firstName: '',
      lastName: '',
      email: 'invalid-email',
      password: '',
      role: 'invalid-role',
      organizationId: 'invalid-id',
    };

    const response = await request(app)
      .post('/auth/register')
      .send(invalidRegisterDto)
      .expect(400);

    expect(response.body).toHaveProperty('message');
    expect(typeof response.body.message).toBe('string');

    expect(response.body.message).toContain('firstName should not be empty');
    expect(response.body.message).toContain('lastName should not be empty');
    expect(response.body.message).toContain('email must be an email');
    expect(response.body.message).toContain(
      'password must be longer than or equal to 8 characters',
    );
    expect(response.body.message).toContain('password should not be empty');
    expect(response.body.message).toContain(
      'role must be one of the following values: admin, user',
    );
    expect(response.body.message).toContain('organizationId must be a UUID');
  });

  it('should fail when a database transaction error occurs', async () => {
    jest
      .spyOn(dataSource, 'transaction')
      .mockRejectedValueOnce(new Error('Database error'));

    const registerDto: RegisterDto = {
      firstName: userMock.firstName,
      lastName: userMock.lastName,
      email: userMock.email,
      password: faker.internet.password(),
      role: userMock.role,
      organizationId: organization.id,
    };

    const response = await request(app)
      .post('/auth/register')
      .send(registerDto)
      .expect(500);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe(
      'Service Error: Failed to register user',
    );

    jest.restoreAllMocks();
  });
});
