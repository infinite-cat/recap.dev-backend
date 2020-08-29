import log, { LogLevelNames } from 'console-log-level'

const logLevel = process.env.logLevel as LogLevelNames || 'info'

export const logger = log({
  prefix() {
    return new Date().toISOString()
  },
  level: logLevel,
})
