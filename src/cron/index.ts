import { analyzeNewTraces } from './analyze-errors.job'
import { enrichNewTraces } from './enrich-traces.job'
import { reportErrors } from './report-errors.job'
import { updateAwsLambdaPriceRates } from './update-aws-lambda-price-rates.job'
import { updateAwsLambdasEstimatedCosts } from './update-lambda-estimated-prices.job'
import { cleanupData } from './cleanup-data.job'
import { aggregateUnitStats } from './aggregate-unit-stats.job'
import { aggregateUnitErrorStats } from './aggregate-unit-error-stats.job'

export const startCronJobs = () => {
  cleanupData.start()
  aggregateUnitStats.start()
  aggregateUnitErrorStats.start()
  analyzeNewTraces.start()
  enrichNewTraces.start()
  reportErrors.start()
  updateAwsLambdaPriceRates.start()
  updateAwsLambdasEstimatedCosts.start()
}
