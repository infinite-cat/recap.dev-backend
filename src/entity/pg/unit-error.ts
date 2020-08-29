import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm'

import { StoredTrace } from './stored-trace'
import { Unit } from './unit'
import { UnitErrorStats } from './unit-error-stats'

@Entity({ name: 'unit_errors' })
export class UnitError {
  constructor(partial?: Partial<UnitError>) {
    if (partial) {
      Object.assign(this, partial)
    }
  }

  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Column({ name: 'unit_name', type: 'varchar', length: 255 })
  unitName: string

  @Column({ name: 'type', type: 'varchar', length: 255 })
  type: string

  @Column({ name: 'error_text', type: 'text' })
  message: string

  @Column({ name: 'raw_error', type: 'jsonb' })
  rawError: any

  @Column({ name: 'last_event_datetime', type: 'timestamp' })
  lastEventDateTime: Date

  @Column({ name: 'first_event_datetime', type: 'timestamp' })
  firstEventDateTime: Date

  @OneToMany(() => StoredTrace, (trace) => trace.unitError)
  errorTraces: StoredTrace[]

  @ManyToOne(() => Unit, (unit) => unit.traces, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unit_name' })
  unit: Unit

  @OneToMany(() => UnitErrorStats, (stat) => stat.unitError)
  stats?: UnitErrorStats[];
}
