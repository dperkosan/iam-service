import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserAndOrganizationTable1741543093288
  implements MigrationInterface
{
  name = 'CreateUserAndOrganizationTable1741543093288';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "iam"."user_role_enum" AS ENUM('admin', 'user')`,
    );
    await queryRunner.query(
      `CREATE TABLE "iam"."user" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "firstName" character varying(255) NOT NULL, "lastName" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "password" character varying(255) NOT NULL, "role" "iam"."user_role_enum" NOT NULL, "emailVerified" boolean NOT NULL DEFAULT false, "enabled" boolean NOT NULL DEFAULT true, "organizationId" uuid NOT NULL, CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_04fadbe34027e27616059828fe" ON "iam"."user" ("email", "organizationId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "iam"."organization" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, CONSTRAINT "PK_472c1f99a32def1b0abb219cd67" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "iam"."user" ADD CONSTRAINT "FK_dfda472c0af7812401e592b6a61" FOREIGN KEY ("organizationId") REFERENCES "iam"."organization"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "iam"."user" DROP CONSTRAINT "FK_dfda472c0af7812401e592b6a61"`,
    );
    await queryRunner.query(`DROP TABLE "iam"."organization"`);
    await queryRunner.query(
      `DROP INDEX "iam"."IDX_04fadbe34027e27616059828fe"`,
    );
    await queryRunner.query(`DROP TABLE "iam"."user"`);
    await queryRunner.query(`DROP TYPE "iam"."user_role_enum"`);
  }
}
