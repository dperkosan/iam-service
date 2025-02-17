import { Request } from 'express';
import { TokenType } from '@modules/iam/enums/token-type.enum';
import { User } from '@modules/iam/entities/user.entity';

export interface ActiveUserData {
  sub: User['id'];
  organizationId: User['organizationId'];
  email: User['email'];
  role: User['role'];
}

export interface DecodedToken extends ActiveUserData {
  tokenId: string;
  tokenType: TokenType;
}

export interface AuthRequest extends Request {
  activeUser?: ActiveUserData;
}
