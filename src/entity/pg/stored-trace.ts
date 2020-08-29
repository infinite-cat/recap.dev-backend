import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from 'typeorm'
import { UnitError } from './unit-error'
import { Unit } from './unit'

@Entity({ name: 'traces' })
export class StoredTrace {
  constructor(partial?: Partial<StoredTrace>) {
    if (partial) {
      Object.assign(this, partial)
    }
  }

  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Column({ name: 'external_id', type: 'varchar', length: 255 })
  externalId: string

  @Column({ name: 'unit_name', type: 'varchar', length: 255 })
  unitName: string

  @Column({ name: 'status', type: 'varchar', length: 255 })
  status: 'ERROR' | 'OK'

  @Column({ name: 'request', type: 'text', nullable: true })
  request?: string

  @Column({ name: 'response', type: 'text', nullable: true })
  response?: string

  @Column({ name: 'error', type: 'jsonb', nullable: true })
  error?: any

  @Column({ name: 'function_call_events', type: 'text', nullable: false })
  functionCallEvents: string

  @Column({ name: 'resource_access_events', type: 'text', nullable: false })
  resourceAccessEvents: string

  @Column({ name: 'extra_data', type: 'jsonb', nullable: true })
  extraData?: any

  @Column({ name: 'logs', type: 'text', nullable: true })
  logs?: string

  @Column({ name: 'enriched', type: 'boolean', nullable: false })
  enriched: boolean = false

  @Column({ type: 'bigint' })
  duration: number

  @Column({ type: 'bigint' })
  start: string

  @Column({ type: 'bigint', nullable: true })
  end?: string

  @ManyToOne(() => UnitError, (unitError) => unitError.errorTraces, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'unit_error_id' })
  unitError?: UnitError

  @ManyToOne(() => Unit, (unit) => unit.traces, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unit_name' })
  unit: Unit
}
