import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class TransactionsUserNullable1739600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('transactions');
    const userFk = table?.foreignKeys.find((fk) => fk.columnNames.includes('user_id'));

    if (userFk) {
      await queryRunner.dropForeignKey('transactions', userFk);
    }

    await queryRunner.changeColumn(
      'transactions',
      'user_id',
      new TableColumn({
        name: 'user_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      'transactions',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('transactions');
    const userFk = table?.foreignKeys.find((fk) => fk.columnNames.includes('user_id'));

    if (userFk) {
      await queryRunner.dropForeignKey('transactions', userFk);
    }

    await queryRunner.changeColumn(
      'transactions',
      'user_id',
      new TableColumn({
        name: 'user_id',
        type: 'uuid',
        isNullable: false,
      }),
    );

    await queryRunner.createForeignKey(
      'transactions',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }
}
