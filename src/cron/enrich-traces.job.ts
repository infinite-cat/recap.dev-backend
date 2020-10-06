import { CronJob } from 'cron'

import { traceService } from '../service'
import { enrichTraces, hasActiveEnrichers, updateEnrichersSettings } from '../service/trace/trace-enricher'
import { logger } from '../utils/logger'
import { config } from '../config'
import { delay } from '../utils/test.utils'

let isRunning = false

export const enrichNewTraces = new CronJob('30 * * * * *', async () => {
  if (isRunning) {
    logger.debug('Traces enrichment job is already running, skipping')
    return
  }

  isRunning = true

  try {
    await updateEnrichersSettings()

    if (!hasActiveEnrichers()) {
      logger.debug('No enrichers active, skipping enrichment job')
      return
    }

    logger.debug('Enriching new traces')

    let tracesToEnrich
    let offset = 0
    do {
      tracesToEnrich = await traceService.getNotEnrichedTraces(config.enrichmentJobBatchSize, offset)
      logger.debug(`Enriching ${tracesToEnrich.length} traces`)
      const enrichedTraces = await enrichTraces(tracesToEnrich)

      await traceService.saveTraces(enrichedTraces)

      offset += tracesToEnrich.length

      await delay(config.enrichmentJobStepDelay)
    } while (tracesToEnrich.length === config.enrichmentJobBatchSize)

    logger.debug('Enriched all traces')
  } finally {
    isRunning = false
  }
})
