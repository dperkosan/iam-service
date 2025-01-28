import { Exclude, Expose, Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { Role } from '@modules/iam/enums/role.enum';
import { Organization } from '@modules/organizations/entities/organization.entity';

@Exclude()
export class RegisterDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value.trim())
  readonly firstName!: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value.trim())
  readonly lastName!: string;

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
  @IsEnum(Role)
  @IsNotEmpty()
  readonly role!: Role;

  @Expose()
  @IsUUID()
  @IsNotEmpty()
  readonly organizationId!: Organization['id'];
}
