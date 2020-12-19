import { CronJob } from 'cron'
import { getConnection, LessThan } from 'typeorm'
import { DateTime } from 'luxon'

import { settingsService } from '../service'
import { StoredTrace, UnitError } from '../entity/pg'
import { logger } from '../utils/logger'

export const cleanupData = new CronJob('0 0 0 * * *', async () => {
  const settings = await settingsService.getSettings()

  if (!settings.cleanupAfterDays) {
    return
  }

  logger.info(`Cleaning up data that is older than ${settings.cleanupAfterDays} days`)

  const connection = getConnection()

  const cutoffDate = DateTime.utc().minus({ days: settings.cleanupAfterDays })

  await connection.getRepository(StoredTrace).delete({
    start: LessThan(cutoffDate.toMillis().toString()),
  })

  await connection.getRepository(UnitError).delete({
    lastEventDateTime: LessThan(cutoffDate.toJSDate()),
  })
})
