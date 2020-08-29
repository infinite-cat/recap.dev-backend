import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'

import { Unit } from './unit'

@Entity({ name: 'unit_stats' })
export class UnitStats {
  constructor(partial?: Partial<UnitStats>) {
    if (partial) {
      Object.assign(this, partial)
    }
  }

  @PrimaryColumn({ name: 'unit_name', type: 'varchar', length: 255 })
  unitName: string

  @PrimaryColumn({ name: 'datetime', type: 'bigint' })
  dateTime: number

  @Column({ name: 'invocations', type: 'bigint' })
  invocations: number

  @Column({ name: 'errors', type: 'bigint' })
  errors: number

  @Column({ name: 'error_rate', type: 'double precision' })
  errorRate: number

  @Column({ name: 'average_duration', type: 'double precision' })
  averageDuration: number

  @ManyToOne(() => Unit, (unit) => unit.stats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unit_name' })
  unit: Unit
}
