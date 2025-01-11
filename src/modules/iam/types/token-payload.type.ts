import { User } from '@modules/iam/entities/user.entity';

type TokenPayload = {
  tokenId?: string;
  email?: User['email'];
  role?: User['role'];
};

export type { TokenPayload };
