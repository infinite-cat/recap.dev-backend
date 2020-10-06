import log from 'console-log-level'
import { config } from '../config'

export const logger = log({
  prefix() {
    return new Date().toISOString()
  },
  level: config.logLevel,
})
