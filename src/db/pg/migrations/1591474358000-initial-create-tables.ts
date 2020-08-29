/* eslint-disable max-len,class-methods-use-this */
import { MigrationInterface, QueryRunner } from 'typeorm'

export class initialCreateTables1591474358000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
        create table if not exists units
        (
            name varchar(255) not null
                constraint "pk_units"
                    primary key
        );

        create table if not exists unit_errors
        (
            id                   bigserial    not null
                constraint "pk_unit_errors"
                    primary key,
            unit_name            varchar(255) not null
                constraint "fk_unit_name"
                    references units
                    on delete cascade,
            type                 varchar(255) not null,
            error_text           text         not null,
            raw_error            text         not null,
            last_event_datetime  timestamp    not null,
            first_event_datetime timestamp    not null
        );

        create table if not exists traces
        (
            id                     varchar(255) not null
                constraint "traces_pk"
                    primary key,
            unit_name              varchar(255) not null
                constraint "fk_unit_name"
                    references units
                    on delete cascade,
            status                 varchar(255) not null,
            request                text,
            response               text,
            error                  text,
            function_call_events   text         not null,
            resource_access_events text         not null,
            duration               bigint       not null,
            start                  bigint       not null,
            "end"                  bigint,
            unit_error_id          bigint
                constraint "fk_unit_error_id"
                    references unit_errors
                    on delete set null
        );
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('DROP TABLE traces')
    await queryRunner.query('DROP TABLE unit_errors')
    await queryRunner.query('DROP TABLE units')
  }
}
