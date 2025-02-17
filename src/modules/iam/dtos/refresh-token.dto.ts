import { Exclude, Expose } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

@Exclude()
export class RefreshTokenDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  readonly refreshToken!: string;
}
