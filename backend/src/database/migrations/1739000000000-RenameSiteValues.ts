import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameSiteValues1739000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "UPDATE users SET site = 'GENSET' WHERE site = 'LANTEBUNG'",
    );
    await queryRunner.query(
      "UPDATE users SET site = 'TUG_ASSIST' WHERE site = 'JENEPONTO'",
    );

    await queryRunner.query(
      "UPDATE transactions SET category = 'GENSET' WHERE category = 'LANTEBUNG'",
    );
    await queryRunner.query(
      "UPDATE transactions SET category = 'TUG_ASSIST' WHERE category = 'JENEPONTO'",
    );

    await queryRunner.query(
      "ALTER TABLE transactions ALTER COLUMN category SET DEFAULT 'GENSET'",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "UPDATE users SET site = 'LANTEBUNG' WHERE site = 'GENSET'",
    );
    await queryRunner.query(
      "UPDATE users SET site = 'JENEPONTO' WHERE site = 'TUG_ASSIST'",
    );

    await queryRunner.query(
      "UPDATE transactions SET category = 'LANTEBUNG' WHERE category = 'GENSET'",
    );
    await queryRunner.query(
      "UPDATE transactions SET category = 'JENEPONTO' WHERE category = 'TUG_ASSIST'",
    );

    await queryRunner.query(
      "ALTER TABLE transactions ALTER COLUMN category SET DEFAULT 'LANTEBUNG'",
    );
  }
}
