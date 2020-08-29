/* eslint-disable max-len,class-methods-use-this */
import { MigrationInterface, QueryRunner } from 'typeorm'

export class addUnitErrorStatsAggregatedTable1596264583000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
        create table if not exists unit_error_stats
        (
            unit_error_id    bigint not null
                constraint "fk_unit_error_id"
                    references unit_errors
                    on delete cascade,
            datetime         bigint           not null,
            occurrences      bigint           not null,
            PRIMARY KEY (unit_error_id, datetime)
        );
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('drop table if exists unit_error_stats;')
  }
}
