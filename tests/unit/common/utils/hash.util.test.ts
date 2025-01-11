import { compare, genSalt, hash } from 'bcrypt';
import { hashData, compareData } from '@common/utils/hash.util';

jest.mock('bcrypt', () => ({
  genSalt: jest.fn(),
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('Hash Utilities', () => {
  describe('hashData', () => {
    it('should generate a salt and hash the data', async () => {
      const data = 'test-data';
      const fakeSalt = 'fake-salt';
      const fakeHash = 'fake-hash';

      (genSalt as jest.Mock).mockResolvedValue(fakeSalt);
      (hash as jest.Mock).mockResolvedValue(fakeHash);

      const result = await hashData(data);

      expect(genSalt).toHaveBeenCalled();
      expect(hash).toHaveBeenCalledWith(data, fakeSalt);
      expect(result).toBe(fakeHash);
    });

    it('should handle errors from genSalt or hash', async () => {
      const data = 'test-data';
      (genSalt as jest.Mock).mockRejectedValue(new Error('Salt error'));

      await expect(hashData(data)).rejects.toThrow('Salt error');
    });
  });

  describe('compareData', () => {
    it('should return true if the data matches the encrypted value', async () => {
      const data = 'test-data';
      const encrypted = 'encrypted-data';

      (compare as jest.Mock).mockResolvedValue(true);

      const result = await compareData(data, encrypted);

      expect(compare).toHaveBeenCalledWith(data, encrypted);
      expect(result).toBe(true);
    });

    it('should return false if the data does not match the encrypted value', async () => {
      const data = 'test-data';
      const encrypted = 'encrypted-data';

      (compare as jest.Mock).mockResolvedValue(false);

      const result = await compareData(data, encrypted);

      expect(compare).toHaveBeenCalledWith(data, encrypted);
      expect(result).toBe(false);
    });

    it('should handle errors from compare', async () => {
      const data = 'test-data';
      const encrypted = 'encrypted-data';

      (compare as jest.Mock).mockRejectedValue(new Error('Compare error'));

      await expect(compareData(data, encrypted)).rejects.toThrow(
        'Compare error',
      );
    });
  });
});
