/* eslint-disable max-len,class-methods-use-this */
import { MigrationInterface, QueryRunner } from 'typeorm'

export class addTypeToUnit1592154288000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
        alter table units
        add column if not exists
        type varchar(255);
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('alter table units drop column if exists type')
  }
}
