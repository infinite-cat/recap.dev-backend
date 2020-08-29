import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'
import os from 'os'

import { NotificationConfiguration } from './notification-configuration'

@Entity({ name: 'settings' })
export class Settings {
  constructor(partial?: Partial<Settings>) {
    if (partial) {
      Object.assign(this, partial)
    }
  }

  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Column({ name: 'is_aws_integration_enabled', type: 'boolean' })
  isAwsIntegrationEnabled: boolean = false

  @Column({ name: 'host', type: 'varchar', nullable: true })
  host: string = `${os.hostname()}:8081`

  @Column({ name: 'cleanup_after_days', type: 'int', nullable: true })
  cleanupAfterDays?: number

  @Column({ name: 'notification_configurations', type: 'jsonb', nullable: true })
  notificationConfigurations?: NotificationConfiguration[]
}
