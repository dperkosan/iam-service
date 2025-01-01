import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserTable1735693356555 implements MigrationInterface {
  name = 'CreateUserTable1735693356555';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "UQ_ed00bef8184efd998af767e89b8"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "UQ_ed00bef8184efd998af767e89b8" UNIQUE ("role", "email")`,
    );
  }
}
