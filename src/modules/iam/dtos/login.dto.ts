import { Exclude, Expose, Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { Organization } from '@modules/organizations/entities/organization.entity';

@Exclude()
export class LoginDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }) => value.trim())
  readonly email!: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  readonly password!: string;

  @Expose()
  @IsUUID()
  @IsNotEmpty()
  readonly organizationId!: Organization['id'];
}
