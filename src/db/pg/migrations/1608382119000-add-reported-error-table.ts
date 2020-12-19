/* eslint-disable max-len,class-methods-use-this */
import { MigrationInterface, QueryRunner } from 'typeorm'

export class addReportedErrorTable1608382119000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
        create table if not exists reported_errors
        (
            unit_error_id bigint
                primary key 
                constraint "fk_unit_error_id"
                    references unit_errors
                    on delete cascade,
            reported_at   bigint not null
        );
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('DROP TABLE if exists reported_errors')
  }
}
