import Redis from 'ioredis';
import logger from '@common/log/app.log';
import getEnvVariable from '@common/utils/env.util';
import { createRedisClient } from '@redis/redis.client';

jest.mock('ioredis');
jest.mock('@common/log/app.log');
jest.mock('@common/utils/env.util');

describe('Redis Client', () => {
  let redisMock: jest.Mocked<Redis>;

  beforeEach(() => {
    // Mock environment variables
    (getEnvVariable as jest.Mock).mockImplementation(
      (key: 'REDIS_URL' | 'REDIS_PORT') => {
        const envVariables = {
          REDIS_URL: 'redis://localhost',
          REDIS_PORT: '6379',
        };
        return envVariables[key];
      },
    );

    // Mock Redis instance
    redisMock = new Redis() as jest.Mocked<Redis>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when creating a Redis client', () => {
    it('should create a Redis client with the correct configuration', () => {
      const client = createRedisClient();
      expect(Redis).toHaveBeenCalledWith('redis://localhost:6379');
      expect(client).toBeDefined();
    });
  });

  describe('when handling Redis client events', () => {
    describe('when an error occurs', () => {
      it('should log an error when the Redis client emits an error', () => {
        createRedisClient();
        const errorHandler = redisMock.on.mock.calls.find(
          ([eventName]) => eventName === 'error',
        )?.[1];

        const error = new Error('Redis connection error');
        errorHandler?.(error);

        expect(logger.error).toHaveBeenCalledWith(
          'Redis connection error:',
          error,
        );
      });
    });

    describe('when the client connects', () => {
      it('should log a message when the Redis client connects', () => {
        createRedisClient();
        const connectHandler = redisMock.on.mock.calls.find(
          ([eventName]) => eventName === 'connect',
        )?.[1];

        connectHandler?.();

        expect(logger.info).toHaveBeenCalledWith(
          'Redis connected successfully.',
        );
      });
    });

    describe('when the client disconnects', () => {
      it('should log a message when the Redis client disconnects', () => {
        createRedisClient();
        const closeHandler = redisMock.on.mock.calls.find(
          ([eventName]) => eventName === 'close',
        )?.[1];

        closeHandler?.();

        expect(logger.info).toHaveBeenCalledWith('Redis connection closed.');
      });
    });
  });
});
