import { Exclude, Expose, Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { Organization } from '@modules/organizations/entities/organization.entity';

@Exclude()
export class SendEmailDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }) => value.trim())
  readonly email!: string;

  @Expose()
  @IsUUID()
  @IsNotEmpty()
  readonly organizationId!: Organization['id'];
}
