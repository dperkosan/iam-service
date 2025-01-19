import dataSource from '@database/config/typeorm.config';
import { User } from '@modules/iam/entities/user.entity';
import { isQueryFailedErrorWithCode } from '@common/errors/query-failed.error';
import { BadRequestError } from '@common/errors/http-status.error';
import logger from '@common/log/app.log';
import * as userRepository from '@modules/iam/repositories/user.repository';
import { EntityManager } from 'typeorm';
import { Role } from '@modules/iam/enums/role.enum';
import { RegisterDto } from '@modules/iam/dtos/register.dto';

jest.mock('@database/config/typeorm.config', () => ({
  getRepository: jest.fn(),
}));

jest.mock('@common/log/app.log', () => ({
  error: jest.fn(),
}));

jest.mock('@common/errors/query-failed.error', () => ({
  isQueryFailedErrorWithCode: jest.fn(),
}));

describe('User Repository', () => {
  describe('createUser', () => {
    const mockUserRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockUser: RegisterDto = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'test@example.com',
      password: 'password123',
      role: Role.ADMIN,
      organizationId: 'org-1234',
    };

    beforeEach(() => {
      (dataSource.getRepository as jest.Mock).mockReturnValue(mockUserRepo);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('when creating and saving a new user', () => {
      it('should successfully create and save the user', async () => {
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
    });

    describe('when the email and organizationId combination already exists', () => {
      it('should throw BadRequestError', async () => {
        // Arrange
        const error = { code: '23505' }; // Duplicate key error code
        mockUserRepo.create.mockReturnValue(mockUser);
        mockUserRepo.save.mockRejectedValue(error);
        (isQueryFailedErrorWithCode as unknown as jest.Mock).mockReturnValue(
          true,
        );

        // Act & Assert
        await expect(userRepository.createUser(mockUser)).rejects.toThrow(
          new BadRequestError('Email already exists'),
        );
        expect(logger.error).toHaveBeenCalledWith('Repository Error:', error);
        expect(isQueryFailedErrorWithCode).toHaveBeenCalledWith(error);
      });
    });

    describe('when an unexpected error occurs', () => {
      it('should rethrow the error', async () => {
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
        expect(isQueryFailedErrorWithCode).toHaveBeenCalledWith(
          unexpectedError,
        );
      });
    });
  });

  describe('createUserInTransaction', () => {
    const mockEntityManager = {
      getRepository: jest.fn(),
    } as unknown as EntityManager;

    const mockUserRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockUser: RegisterDto = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'test@example.com',
      password: 'password123',
      role: Role.ADMIN,
      organizationId: 'org-1234',
    };

    beforeEach(() => {
      mockEntityManager.getRepository = jest.fn().mockReturnValue(mockUserRepo);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('when creating and saving a user in a transaction', () => {
      it('should successfully create and save the user', async () => {
        // Arrange
        const savedUser = { id: 1, ...mockUser };
        mockUserRepo.create.mockReturnValue(mockUser);
        mockUserRepo.save.mockResolvedValue(savedUser);

        // Act
        const result = await userRepository.createUserInTransaction(
          mockEntityManager,
          mockUser,
        );

        // Assert
        expect(mockEntityManager.getRepository).toHaveBeenCalledWith(User);
        expect(mockUserRepo.create).toHaveBeenCalledWith(mockUser);
        expect(mockUserRepo.save).toHaveBeenCalledWith(mockUser);
        expect(result).toEqual(savedUser);
      });
    });

    describe('when the email and organizationId combination already exists in a transaction', () => {
      it('should throw BadRequestError', async () => {
        // Arrange
        const error = { code: '23505' }; // Duplicate key error code
        mockUserRepo.create.mockReturnValue(mockUser);
        mockUserRepo.save.mockRejectedValue(error);
        (isQueryFailedErrorWithCode as unknown as jest.Mock).mockReturnValue(
          true,
        );

        // Act & Assert
        await expect(
          userRepository.createUserInTransaction(mockEntityManager, mockUser),
        ).rejects.toThrow(new BadRequestError('Email already exists'));
        expect(logger.error).toHaveBeenCalledWith('Repository Error:', error);
        expect(isQueryFailedErrorWithCode).toHaveBeenCalledWith(error);
      });
    });

    describe('when an unexpected error occurs in a transaction', () => {
      it('should rethrow the error', async () => {
        // Arrange
        const unexpectedError = new Error('Unexpected Error');
        mockUserRepo.create.mockReturnValue(mockUser);
        mockUserRepo.save.mockRejectedValue(unexpectedError);

        // Act & Assert
        await expect(
          userRepository.createUserInTransaction(mockEntityManager, mockUser),
        ).rejects.toThrow(unexpectedError);
        expect(logger.error).toHaveBeenCalledWith(
          'Repository Error:',
          unexpectedError,
        );
        expect(isQueryFailedErrorWithCode).toHaveBeenCalledWith(
          unexpectedError,
        );
      });
    });
  });
});
