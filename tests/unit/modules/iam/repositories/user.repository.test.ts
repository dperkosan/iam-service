import dataSource from '@database/config/typeorm.config';
import { User } from '@modules/iam/entities/user.entity';
import { isQueryFailedErrorWithCode } from '@common/errors/query-failed.error';
import { BadRequestError } from '@common/errors/http-status.error';
import logger from '@common/log/app.log';
import * as userRepository from '@modules/iam/repositories/user.repository';

jest.mock('@database/config/typeorm.config', () => ({
  getRepository: jest.fn(),
}));

jest.mock('@common/log/app.log', () => ({
  error: jest.fn(),
}));

jest.mock('@common/errors/query-failed.error', () => ({
  isQueryFailedErrorWithCode: jest.fn(),
}));

describe('User Repository - createUser', () => {
  const mockUserRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUser = { email: 'test@example.com', password: 'password123' };

  beforeEach(() => {
    (dataSource.getRepository as jest.Mock).mockReturnValue(mockUserRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create and save a new user', async () => {
    // Arrange
    const savedUser = { id: 1, ...mockUser };
    mockUserRepo.create.mockReturnValue(mockUser);
    mockUserRepo.save.mockResolvedValue(savedUser);

    // Act
    const result = await userRepository.createUser(mockUser);

    // Assert
    expect(dataSource.getRepository).toHaveBeenCalledWith(User);
    expect(mockUserRepo.create).toHaveBeenCalledWith(mockUser);
    expect(mockUserRepo.save).toHaveBeenCalledWith(mockUser);
    expect(result).toEqual(savedUser);
  });

  it('should throw BadRequestError if email already exists', async () => {
    // Arrange
    const error = { code: '23505' };
    mockUserRepo.create.mockReturnValue(mockUser);
    mockUserRepo.save.mockRejectedValue(error);
    (isQueryFailedErrorWithCode as unknown as jest.Mock).mockReturnValue(true);

    // Act & Assert
    await expect(userRepository.createUser(mockUser)).rejects.toThrow(
      new BadRequestError('Email already exists'),
    );
    expect(logger.error).toHaveBeenCalledWith('Repository Error:', error);
    expect(isQueryFailedErrorWithCode).toHaveBeenCalledWith(error);
  });

  it('should rethrow unexpected errors', async () => {
    // Arrange
    const unexpectedError = new Error('Unexpected Error');
    mockUserRepo.create.mockReturnValue(mockUser);
    mockUserRepo.save.mockRejectedValue(unexpectedError);

    // Act & Assert
    await expect(userRepository.createUser(mockUser)).rejects.toThrow(
      unexpectedError,
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Repository Error:',
      unexpectedError,
    );
    expect(isQueryFailedErrorWithCode).toHaveBeenCalledWith(unexpectedError);
  });
});
