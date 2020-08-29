/* eslint-disable max-len,class-methods-use-this */
import { MigrationInterface, QueryRunner } from 'typeorm'

export class addLogsToTrace1592335995000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
        alter table traces
        add column if not exists
        logs text;
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('alter table traces drop column if exists logs')
  }
}
