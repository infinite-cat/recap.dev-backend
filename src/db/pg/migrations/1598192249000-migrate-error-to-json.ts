/* eslint-disable max-len,class-methods-use-this */
import { MigrationInterface, QueryRunner } from 'typeorm'

export class migrateErrorToJson1598192249000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
        alter table traces
            ALTER COLUMN error TYPE JSONB USING error::JSONB;
        alter table unit_errors
            ALTER COLUMN raw_error TYPE JSONB USING raw_error::JSONB;
    `)
  }

  public async down(_: QueryRunner): Promise<any> {
    // Do nothing
  }
}
