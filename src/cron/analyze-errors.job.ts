import { CronJob } from 'cron'
import { traceService, unitErrorService } from '../service'
import { logger } from '../utils/logger'
import { config } from '../config'

let isRunning = false

export const analyzeNewTraces = new CronJob('0 * * * * *', async () => {
  console.log('Finding errors in new traces')

  if (isRunning) {
    logger.debug('Error analysis job is already running, skipping')
    return
  }

  isRunning = true

  try {
    let tracesToAnalyze
    let offset = 0
    do {
      tracesToAnalyze = await traceService.getTracesWithoutError(100, offset)
      logger.debug(`There are ${tracesToAnalyze.length} traces to analyze`)
      await unitErrorService.analyzeTraces(tracesToAnalyze)

      offset += tracesToAnalyze.length
    } while (tracesToAnalyze.length === config.enrichmentJobBatchSize)
  } finally {
    isRunning = false
  }
})
