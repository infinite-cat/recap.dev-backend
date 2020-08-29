import { chain } from 'lodash'

import { ErrorReportData } from '../../entity/error-report-data'
import {
  NotificationConfiguration,
  NotificationConfigurationType,
  SlackNotificationConfiguration,
} from '../../entity/pg/notification-configuration'
import { Settings } from '../../entity/pg'
import { SlackService } from './slack.service'

export class NotificationChannelService {
  public async reportErrors(errorReportDatas: ErrorReportData[], settings: Settings) {
    return Promise.all(chain(settings.notificationConfigurations)
      .map((configuration) => this.createNofiticationService(configuration, settings))
      .map((service) => service.reportErrors(errorReportDatas))
      .value())
  }

  private createNofiticationService(configuration: NotificationConfiguration, settings: Settings) {
    switch (configuration.type) {
      case NotificationConfigurationType.Slack:
        return new SlackService(configuration as SlackNotificationConfiguration, settings)
      default:
        throw new Error(`Unknown notification channel: ${configuration.type}`)
    }
  }
}

export const notificationChannelService = new NotificationChannelService()
