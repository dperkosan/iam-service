import { compare, genSalt, hash } from 'bcrypt';
import { hashData, compareData } from '@common/utils/hash.util';

jest.mock('bcrypt', () => ({
  genSalt: jest.fn(),
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('Hash Utilities', () => {
  describe('hashData', () => {
    describe('when hashing data successfully', () => {
      it('should generate a salt and hash the data', async () => {
        // Arrange
        const data = 'test-data';
        const fakeSalt = 'fake-salt';
        const fakeHash = 'fake-hash';

        (genSalt as jest.Mock).mockResolvedValue(fakeSalt);
        (hash as jest.Mock).mockResolvedValue(fakeHash);

        // Act
        const result = await hashData(data);

        // Assert
        expect(genSalt).toHaveBeenCalled();
        expect(hash).toHaveBeenCalledWith(data, fakeSalt);
        expect(result).toBe(fakeHash);
      });
    });

    describe('when an error occurs during hashing', () => {
      it('should handle errors from genSalt', async () => {
        // Arrange
        const data = 'test-data';
        const saltError = new Error('Salt error');

        (genSalt as jest.Mock).mockRejectedValue(saltError);

        // Act & Assert
        await expect(hashData(data)).rejects.toThrow('Salt error');
      });

      it('should handle errors from hash', async () => {
        // Arrange
        const data = 'test-data';
        const fakeSalt = 'fake-salt';
        const hashError = new Error('Hash error');

        (genSalt as jest.Mock).mockResolvedValue(fakeSalt);
        (hash as jest.Mock).mockRejectedValue(hashError);

        // Act & Assert
        await expect(hashData(data)).rejects.toThrow('Hash error');
      });
    });
  });

  describe('compareData', () => {
    describe('when the data matches the encrypted value', () => {
      it('should return true', async () => {
        // Arrange
        const data = 'test-data';
        const encrypted = 'encrypted-data';

        (compare as jest.Mock).mockResolvedValue(true);

        // Act
        const result = await compareData(data, encrypted);

        // Assert
        expect(compare).toHaveBeenCalledWith(data, encrypted);
        expect(result).toBe(true);
      });
    });

    describe('when the data does not match the encrypted value', () => {
      it('should return false', async () => {
        // Arrange
        const data = 'test-data';
        const encrypted = 'encrypted-data';

        (compare as jest.Mock).mockResolvedValue(false);

        // Act
        const result = await compareData(data, encrypted);

        // Assert
        expect(compare).toHaveBeenCalledWith(data, encrypted);
        expect(result).toBe(false);
      });
    });

    describe('when an error occurs during comparison', () => {
      it('should handle errors from compare', async () => {
        // Arrange
        const data = 'test-data';
        const encrypted = 'encrypted-data';
        const compareError = new Error('Compare error');

        (compare as jest.Mock).mockRejectedValue(compareError);

        // Act & Assert
        await expect(compareData(data, encrypted)).rejects.toThrow(
          'Compare error',
        );
      });
    });
  });
});
