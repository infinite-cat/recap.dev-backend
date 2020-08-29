import { getConnection } from 'typeorm'

import { StoredTrace, Settings } from '../../../entity/pg'
import { awsLambdaTraceEnricher } from './aws-lambda-trace-enricher'

export const traceEnrichers = [awsLambdaTraceEnricher]

export const updateEnrichersSettings = async (settingsParam?: Settings) => {
  // TODO: Refactor with DI
  const settings = settingsParam || (await getConnection().getRepository(Settings).findOne()) || new Settings()

  for (const enricher of traceEnrichers) {
    enricher.onSettingsUpdated(settings!)
  }
}

export const enrichTraces = async (traces: StoredTrace[]) => {
  for (const enricher of traceEnrichers) {
    const supportedTraces = traces.filter((trace) => enricher.supports(trace))

    await enricher.enrich(supportedTraces)
  }

  return traces
}
