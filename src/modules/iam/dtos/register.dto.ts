import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '@modules/iam/enums/role.enum';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value.trim())
  readonly firstName!: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value.trim())
  readonly lastName!: string;

  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }) => value.trim())
  readonly email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  readonly password!: string;

  @IsEnum(Role)
  @IsNotEmpty()
  readonly role!: Role;
}
