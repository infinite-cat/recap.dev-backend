/* eslint-disable max-len,class-methods-use-this */
import { MigrationInterface, QueryRunner } from 'typeorm'

export class addUnitStatsAggregatedTable1596264583000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
        create table if not exists unit_stats
        (
            unit_name        varchar(255)     not null
                constraint "fk_unit_name"
                    references units
                    on delete cascade,
            datetime         bigint           not null,
            invocations      bigint           not null,
            errors           bigint           not null,
            error_rate       double precision null,
            average_duration double precision null,
            PRIMARY KEY (unit_name, datetime)
        );
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('drop table if exists unit_stats;')
  }
}
