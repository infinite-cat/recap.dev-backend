/* eslint-disable max-len,class-methods-use-this */
import { MigrationInterface, QueryRunner } from 'typeorm'

export class reworkIndexesOnTraces1606855805000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
        DROP INDEX if exists traces_unit_name_start_idx;

        DROP INDEX if exists traces_unit_error_id_start_idx;

        CREATE INDEX if not exists unit_stats_datetime_idx ON unit_stats (datetime);

        CREATE INDEX if not exists unit_name_idx ON traces (unit_name);

        CREATE INDEX if not exists unit_error_id_idx on traces (unit_error_id);

        CREATE INDEX if not exists status_idx on traces (status);

    `)
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
        DROP INDEX if exists unit_name_idx;

        DROP INDEX if exists unit_error_id_idx;

        DROP INDEX if exists status_idx;

        DROP INDEX if exists unit_stats_datetime_idx;
    `)
  }
}
