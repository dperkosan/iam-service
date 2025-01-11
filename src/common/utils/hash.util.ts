import { compare, genSalt, hash } from 'bcrypt';

export const hashData = async (data: string | Buffer): Promise<string> => {
  const salt = await genSalt();
  return hash(data, salt);
};

export const compareData = async (
  data: string | Buffer,
  encrypted: string,
): Promise<boolean> => {
  return compare(data, encrypted);
};
