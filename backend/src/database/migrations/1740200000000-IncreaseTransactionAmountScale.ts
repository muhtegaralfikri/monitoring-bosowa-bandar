import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class IncreaseTransactionAmountScale1740200000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      'transactions',
      'amount',
      new TableColumn({
        name: 'amount',
        type: 'decimal',
        precision: 12,
        scale: 6,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      'transactions',
      'amount',
      new TableColumn({
        name: 'amount',
        type: 'decimal',
        precision: 10,
        scale: 2,
        isNullable: false,
      }),
    );
  }
}
