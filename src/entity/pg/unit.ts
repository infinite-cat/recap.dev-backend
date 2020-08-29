import { Entity, OneToMany, PrimaryColumn, Column } from 'typeorm'

import { StoredTrace } from './stored-trace'
import { UnitStats } from './unit-stats'

@Entity({ name: 'units' })
export class Unit {
  constructor(partial?: Partial<Unit>) {
    if (partial) {
      Object.assign(this, partial)
    }
  }

  @PrimaryColumn({ name: 'name', type: 'varchar', length: 255 })
  name: string

  @Column({ name: 'type', type: 'varchar', length: 255 })
  type?: string

  @Column({ name: 'estimated_cost', type: 'double precision' })
  estimatedCost?: number

  @OneToMany(() => StoredTrace, (trace) => trace.unit)
  traces?: StoredTrace[];

  @OneToMany(() => UnitStats, (stats) => stats.unit)
  stats?: UnitStats[];
}
