import { CronJob } from 'cron'

import { traceService } from '../service'
import { enrichTraces, updateEnrichersSettings } from '../service/trace/trace-enricher'

let isRunning = false

export const enrichNewTraces = new CronJob('0 * * * * *', async () => {
  if (isRunning) {
    console.log('Traces enrichment job is already running, skipping')
    return
  }

  isRunning = true

  try {
    await updateEnrichersSettings()
    console.log('Enriching new traces')
    const tracesToEnrich = await traceService.getNotEnrichedTraces()
    console.log(`There are ${tracesToEnrich.length} traces to enrich`)
    const enrichedTraces = await enrichTraces(tracesToEnrich)

    await traceService.saveTraces(enrichedTraces)
    console.log('Enriched all traces')
  } finally {
    isRunning = false
  }
})
