import { LogLevelNames } from 'console-log-level'

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

  get enrichmentJobBatchSize() {
    return (process.env.ENRICHMENT_JOB_BATCH_SIZE && Number(process.env.ENRICHMENT_JOB_BATCH_SIZE)) || 1000
  }

  get enrichmentJobStepDelay() {
    return (process.env.ENRICHMENT_JOB_STEP_DELAY && Number(process.env.ENRICHMENT_JOB_STEP_DELAY)) || 2000
  }
}

export const config = new Config()
