import * as express from 'express'
import { traceRouter } from './trace'

export const routes = (app: express.Application) => {
  app.use('/traces', traceRouter)
}
