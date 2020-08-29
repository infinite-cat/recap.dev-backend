export enum NotificationConfigurationType {
  Slack = 'slack',
}

export interface NotificationConfiguration {
  type: NotificationConfigurationType
}

export interface SlackNotificationConfiguration extends NotificationConfiguration {
  token: string
  channelId: string
}
