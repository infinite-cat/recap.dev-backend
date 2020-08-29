/* eslint-disable max-len,class-methods-use-this */
import { MigrationInterface, QueryRunner } from 'typeorm'

export class addNotificationConfigurationsToSettings1594151441000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
        alter table settings
        add column if not exists
        notification_configurations jsonb default null;
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('alter table settings drop column if exists notification_configurations')
  }
}
