import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity('aws_lambda_prices')
export class AwsLambdaPrice {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  region: string

  @Column({ name: 'price_per_gb_seconds', type: 'double precision' })
  pricePerGbSeconds: number

  @Column({ name: 'request_price', type: 'double precision' })
  requestPrice: number
}
