/* eslint-disable max-len,class-methods-use-this */
import { MigrationInterface, QueryRunner } from 'typeorm'

export class addHostToSettings1594154737000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
        alter table settings
        add column if not exists
        host varchar default null;
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('alter table settings drop column if exists host')
  }
}
