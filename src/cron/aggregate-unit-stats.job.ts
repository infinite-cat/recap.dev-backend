import { CronJob } from 'cron'
import { DateTime } from 'luxon'
import { unitService } from '../service'
import { logger } from '../utils/logger'

export const aggregateUnitStats = new CronJob('0 0/5 * * * *', async () => {
  logger.info('Aggregating unit stats')
  await unitService.recalculateUnitsStats(DateTime.utc().minus({ minutes: 15 }).toMillis())
  logger.info('Aggregated unit stats')
})
