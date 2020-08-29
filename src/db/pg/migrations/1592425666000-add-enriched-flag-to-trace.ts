/* eslint-disable max-len,class-methods-use-this */
import { MigrationInterface, QueryRunner } from 'typeorm'

export class addEnrichedFlagToTrace1592425666000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
        alter table traces
        add column if not exists
        enriched boolean default false;
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('alter table traces drop column if exists enriched')
  }
}
