import { CronJob } from 'cron'
import { traceService, unitErrorService } from '../service'

export const analyzeNewTraces = new CronJob('0 * * * * *', async () => {
  console.log('Finding errors in new traces')
  const tracesToAnalyze = await traceService.getTracesWithoutError()
  console.log(`There are ${tracesToAnalyze.length} traces to analyze`)
  await unitErrorService.analyzeTraces(tracesToAnalyze)
})
