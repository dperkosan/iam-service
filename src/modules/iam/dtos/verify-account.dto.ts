import { Exclude, Expose } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

@Exclude()
export class VerifyAccountDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  readonly token!: string;
}
