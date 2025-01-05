import { RegisterDto } from '@modules/iam/dtos/register.dto';
import * as userRepository from '@modules/iam/repositories/user.repository';
import { AppError } from '@common/errors/http-status.error';
import logger from '@common/log/app.log';
import * as authService from '@modules/iam/services/auth.service';
import { Role } from '@modules/iam/enums/role.enum';

jest.mock('@modules/iam/repositories/user.repository');
jest.mock('@common/log/app.log', () => ({
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('Auth Service - register', () => {
  const mockRegisterDto: RegisterDto = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'test@example.com',
    password: 'password123',
    role: Role.ADMIN,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully create a user', async () => {
    // Arrange
    const createdUser = { id: 1, email: 'test@example.com' };
    (userRepository.createUser as jest.Mock).mockResolvedValue(createdUser);

    // Act
    const result = await authService.register(mockRegisterDto);

    // Assert
    expect(userRepository.createUser).toHaveBeenCalledWith(mockRegisterDto);
    expect(result).toEqual(createdUser);
  });

  it('should throw validation/conflict error and log warning', async () => {
    // Arrange
    const validationError = new AppError(
      'Validation Error: Email already exists',
      400,
    );
    (userRepository.createUser as jest.Mock).mockRejectedValue(validationError);

    // Act & Assert
    await expect(authService.register(mockRegisterDto)).rejects.toThrow(
      validationError,
    );
    expect(userRepository.createUser).toHaveBeenCalledWith(mockRegisterDto);
    expect(logger.warn).toHaveBeenCalledWith(
      'Validation or Conflict Error:',
      validationError.message,
    );
  });

  it('should throw an unexpected error and log it', async () => {
    // Arrange
    const unexpectedError = new Error('Unexpected Error');
    (userRepository.createUser as jest.Mock).mockRejectedValue(unexpectedError);

    // Act & Assert
    await expect(authService.register(mockRegisterDto)).rejects.toThrow(
      new AppError('Service Error: Failed to register user', 500),
    );
    expect(userRepository.createUser).toHaveBeenCalledWith(mockRegisterDto);
    expect(logger.error).toHaveBeenCalledWith(
      'Unexpected Service Error:',
      unexpectedError,
    );
  });
});
