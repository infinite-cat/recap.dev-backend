import { CronJob } from 'cron'
import { DateTime } from 'luxon'
import { unitErrorService } from '../service'
import { logger } from '../utils/logger'

export const aggregateUnitErrorStats = new CronJob('45 0/5 * * * *', async () => {
  logger.info('Aggregating unit error stats')
  await unitErrorService.recalculateErrorStats(DateTime.utc().minus({ minutes: 15 }).toMillis())
  logger.info('Aggregated unit error stats')
})
