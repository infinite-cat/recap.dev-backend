/* eslint-disable max-len,class-methods-use-this */
import { MigrationInterface, QueryRunner } from 'typeorm'

export class addExternalTraceId1597580631000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
        alter table traces
            drop constraint traces_pk;
        alter table traces
            rename column id TO external_id;
        alter table traces
            add column id SERIAL NOT NULL;
        alter table traces
            add constraint traces_pk
                PRIMARY KEY (id);
    `)
  }

  public async down(_: QueryRunner): Promise<any> {
    // Do nothing
  }
}
