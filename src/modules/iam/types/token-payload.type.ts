import { User } from '@modules/iam/entities/user.entity';

type TokenPayload = {
  tokenId?: string;
  organizationId?: User['organizationId'];
  email?: User['email'];
  role?: User['role'];
};

export type { TokenPayload };
