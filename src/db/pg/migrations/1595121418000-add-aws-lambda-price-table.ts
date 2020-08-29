/* eslint-disable max-len,class-methods-use-this */
import { MigrationInterface, QueryRunner } from 'typeorm'

export class addAwsLambdaPriceTable1595121418000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
        create table if not exists
            aws_lambda_prices (
                region varchar(64) not null PRIMARY KEY,
                price_per_gb_seconds double precision not null,
                request_price double precision not null
        )
        `)
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('drop table if exists aws_lambda_prices')
  }
}
