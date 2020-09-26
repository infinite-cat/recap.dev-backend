import { CronJob } from 'cron'

import { traceService } from '../service'
import { enrichTraces, updateEnrichersSettings } from '../service/trace/trace-enricher'

let isRunning = false

const traceBatchSize = 100

export const enrichNewTraces = new CronJob('0 * * * * *', async () => {
  if (isRunning) {
    console.log('Traces enrichment job is already running, skipping')
    return
  }

  isRunning = true

  try {
    await updateEnrichersSettings()
    console.log('Enriching new traces')

    let tracesToEnrich
    do {
      tracesToEnrich = await traceService.getNotEnrichedTraces(traceBatchSize)
      console.log(`Enriching ${tracesToEnrich.length} traces`)
      const enrichedTraces = await enrichTraces(tracesToEnrich)

      await traceService.saveTraces(enrichedTraces)
    } while (tracesToEnrich.length === traceBatchSize)
    console.log('Enriched all traces')
  } finally {
    isRunning = false
  }
})
