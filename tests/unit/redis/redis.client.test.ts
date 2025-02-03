import Redis from 'ioredis';
import logger from '@common/log/app.log';
import getEnvVariable from '@common/utils/env.util';
import { createRedisClient, redisClient } from '@redis/redis.client';
import { MissingEnvError } from '@common/errors/http-status.error';

jest.mock('ioredis');
jest.mock('@common/log/app.log');
jest.mock('@common/utils/env.util');

describe('Redis Client', () => {
  let redisMock: jest.Mocked<Redis>;

  beforeEach(() => {
    // Mock environment variables
    (getEnvVariable as jest.Mock).mockImplementation(
      (key: 'REDIS_URL' | 'REDIS_PORT' | 'REDIS_DB') => {
        const envVariables = {
          REDIS_URL: 'redis://localhost',
          REDIS_PORT: '6379',
          REDIS_DB: '0',
        };
        return envVariables[key];
      },
    );

    // Mock Redis instance
    redisMock = {
      on: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
    } as unknown as jest.Mocked<Redis>;

    // Ensure Redis constructor is properly mocked
    (Redis as unknown as jest.Mock).mockImplementation(() => redisMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when creating a Redis client', () => {
    it('should create a Redis client with the correct configuration', () => {
      // Act
      const client = createRedisClient();

      // Assert
      expect(Redis).toHaveBeenCalledWith('redis://localhost:6379/0');
      expect(client).toBeDefined();
    });

    it('should return a singleton instance for redisClient', () => {
      // Act
      const instance1 = redisClient;
      const instance2 = redisClient;

      // Assert
      expect(instance1).toBe(instance2);
    });
  });

  describe('when handling Redis client events', () => {
    it('should register event listeners for error, connect, and close', () => {
      // Act
      createRedisClient();

      // Assert
      expect(redisMock.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(redisMock.on).toHaveBeenCalledWith(
        'connect',
        expect.any(Function),
      );
      expect(redisMock.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    describe('when an error occurs', () => {
      it('should log an error when the Redis client emits an error', () => {
        // Arrange
        createRedisClient();
        const errorHandler = redisMock.on.mock.calls.find(
          ([eventName]) => eventName === 'error',
        )?.[1];

        const error = new Error('Redis connection error');

        // Act
        errorHandler?.(error);

        // Assert
        expect(logger.error).toHaveBeenCalledWith(
          'Redis connection error:',
          error,
        );
      });
    });

    describe('when the client connects', () => {
      it('should log a message when the Redis client connects', () => {
        // Arrange
        createRedisClient();
        const connectHandler = redisMock.on.mock.calls.find(
          ([eventName]) => eventName === 'connect',
        )?.[1];

        // Act
        connectHandler?.();

        // Assert
        expect(logger.info).toHaveBeenCalledWith(
          'Redis connected successfully to DB 0.',
        );
      });
    });

    describe('when the client disconnects', () => {
      it('should log a message when the Redis client disconnects', () => {
        // Arrange
        createRedisClient();
        const closeHandler = redisMock.on.mock.calls.find(
          ([eventName]) => eventName === 'close',
        )?.[1];

        // Act
        closeHandler?.();

        // Assert
        expect(logger.info).toHaveBeenCalledWith('Redis connection closed.');
      });
    });
  });

  describe('when environment variables are missing or invalid', () => {
    it('should throw an error if REDIS_URL is missing', () => {
      // Arrange
      (getEnvVariable as jest.Mock).mockImplementation((key) => {
        if (key === 'REDIS_URL') {
          throw new MissingEnvError(key);
        }
        return '6379';
      });

      // Act & Assert
      expect(() => createRedisClient()).toThrow();
    });

    it('should throw an error if REDIS_PORT is missing', () => {
      // Arrange
      (getEnvVariable as jest.Mock).mockImplementation((key) => {
        if (key === 'REDIS_PORT') {
          throw new MissingEnvError(key);
        }
        return 'redis://localhost';
      });

      // Act & Assert
      expect(() => createRedisClient()).toThrow();
    });

    it('should throw an error if REDIS_DB is missing', () => {
      // Arrange
      (getEnvVariable as jest.Mock).mockImplementation((key) => {
        if (key === 'REDIS_DB') {
          throw new MissingEnvError(key);
        }
        return 'redis://localhost';
      });

      // Act & Assert
      expect(() => createRedisClient()).toThrow();
    });
  });
});
