import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSiteAndCategory1738000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'site',
        type: 'varchar',
        length: '50',
        isNullable: true,
        default: "'ALL'",
      }),
    );

    await queryRunner.addColumn(
      'transactions',
      new TableColumn({
        name: 'category',
        type: 'varchar',
        length: '50',
        isNullable: false,
        default: "'LANTEBUNG'",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('transactions', 'category');
    await queryRunner.dropColumn('users', 'site');
  }
}
