/* eslint-disable max-len,class-methods-use-this */
import { MigrationInterface, QueryRunner } from 'typeorm'

export class addSettingsTable1593537878000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
        create table if not exists settings
        (
            id                   bigserial    not null
                constraint "pk_settings"
                    primary key,
            is_aws_integration_enabled bool
        );
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('DROP TABLE settings')
  }
}
