import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity({ name: 'reported_errors' })
export class ReportedError {
  constructor(partial?: Partial<ReportedError>) {
    if (partial) {
      Object.assign(this, partial)
    }
  }

  @PrimaryColumn({ name: 'unit_error_id', type: 'bigint' })
  unitErrorId: number

  @Column({ name: 'reported_at', type: 'bigint' })
  reportedAt: number
}
