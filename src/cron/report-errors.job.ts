import { CronJob } from 'cron'
import { DateTime } from 'luxon'
import { isEmpty } from 'lodash'

import { settingsService, traceService } from '../service'
import { notificationChannelService } from '../service/notification/notification-channel.service'

export const reportErrors = new CronJob('0 0/5 * * * *', async () => {
  console.log('Reporting new errors')
  try {
    const settings = await settingsService.getSettings()

    if (isEmpty(settings?.notificationConfigurations)) {
      console.log('No notification channels configured, skipping reporting new errors')
      return
    }

    const errorData = await traceService.getErrorReport(DateTime.utc().minus({ minutes: 5 }).toMillis())

    await notificationChannelService.reportErrors(errorData, settings)
  } catch (err) {
    console.log('Error while reporting new errors: ')
    console.error(err)
  }
})
