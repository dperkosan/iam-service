import { TokenType } from '@modules/iam/enums/token-type.enum';

export interface ActiveUserData {
  sub: string;
}

export interface DecodedToken extends ActiveUserData {
  tokenId: string;
  tokenType: TokenType;
}
