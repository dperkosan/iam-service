import { Exclude, Expose } from 'class-transformer';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

@Exclude()
export class ResetPasswordDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  readonly token!: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  readonly newPassword!: string;
}
