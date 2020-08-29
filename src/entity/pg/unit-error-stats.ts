import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'

import { UnitError } from './unit-error'

@Entity({ name: 'unit_error_stats' })
export class UnitErrorStats {
  constructor(partial?: Partial<UnitErrorStats>) {
    if (partial) {
      Object.assign(this, partial)
    }
  }

  @PrimaryColumn({ name: 'unit_error_id', type: 'bigint' })
  unitErrorId: number

  @PrimaryColumn({ name: 'datetime', type: 'bigint' })
  dateTime: number

  @Column({ name: 'occurrences', type: 'bigint' })
  occurrences: number

  @ManyToOne(() => UnitError, (unitError) => unitError.stats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unit_error_id' })
  unitError: UnitError
}
