import { CronJob } from 'cron'
import { DateTime } from 'luxon'
import { unitErrorService } from '../service'

export const aggregateUnitErrorStats = new CronJob('45 0/5 * * * *', async () => {
  console.log('Aggregating unit error stats')
  await unitErrorService.recalculateErrorStats(DateTime.utc().minus({ minutes: 15 }).toMillis())
  console.log('Aggregated unit error stats')
})
