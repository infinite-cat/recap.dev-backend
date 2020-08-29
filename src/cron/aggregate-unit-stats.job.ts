import { CronJob } from 'cron'
import { DateTime } from 'luxon'
import { unitService } from '../service'

export const aggregateUnitStats = new CronJob('0 0/5 * * * *', async () => {
  console.log('Aggregating unit stats')
  await unitService.recalculateUnitsStats(DateTime.utc().minus({ minutes: 15 }).toMillis())
  console.log('Aggregated unit stats')
})
