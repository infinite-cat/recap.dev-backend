/* eslint-disable max-len,class-methods-use-this */
import { MigrationInterface, QueryRunner } from 'typeorm'

export class addIndexesOnTraceTable1601126386000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
        CREATE INDEX if not exists traces_unit_name_start_idx ON traces (unit_name, start DESC NULLS FIRST, id DESC NULLS FIRST);

        CREATE INDEX if not exists traces_unit_error_id_start_idx ON traces (unit_error_id, start DESC NULLS FIRST, id DESC NULLS FIRST);

        CREATE INDEX if not exists traces_start_idx ON traces (start DESC NULLS FIRST, id DESC NULLS FIRST);
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
        DROP INDEX if exists traces_unit_name_start_idx;

        DROP INDEX if exists traces_unit_error_id_start_idx;

        DROP INDEX if exists traces_start_idx;
    `)
  }
}
