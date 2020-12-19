import { LogLevelNames } from 'console-log-level'
import { get } from 'lodash'

class Config {
  get trackingPort() {
    return (process.env.TRACKING_PORT && Number(process.env.TRACKING_PORT)) || 8080
  }

  get uiPort() {
    return process.env.UI_PORT ? Number(process.env.UI_PORT) : 8081
  }

  get logLevel() {
    return process.env.logLevel as LogLevelNames || 'info'
  }

  get backgroundJobsEnabled() {
    return !process.env.BACKGROUND_JOBS_ENABLED || process.env.BACKGROUND_JOBS_ENABLED === 'true'
  }

  get tracingApiEnabled() {
    return !process.env.TRACING_API_ENABLED || process.env.TRACING_API_ENABLED === 'true'
  }

  get traceProcessingBatchSize() {
    return Number(get(process.env, 'TRACE_PROCESSING_BATCH_SIZE', 100))
  }

  get uiEnabled() {
    return !process.env.UI_ENABLED || process.env.UI_ENABLED === 'true'
  }

  get enrichmentJobBatchSize() {
    return (process.env.ENRICHMENT_JOB_BATCH_SIZE && Number(process.env.ENRICHMENT_JOB_BATCH_SIZE)) || 1000
  }

  get enrichmentJobStepDelay() {
    return (process.env.ENRICHMENT_JOB_STEP_DELAY && Number(process.env.ENRICHMENT_JOB_STEP_DELAY)) || 2000
  }

  get queueUrl() {
    return process.env.QUEUE_URL || 'amqp://localhost'
  }
}

export const config = new Config()
