import express from 'express'
import http from 'http'
import path from 'path'

import { analyticsApi } from './graphql'
import { trackingApi } from './tracking'
import { startCronJobs } from './cron'
import { createDbConnection } from './db/pg'
import { config } from './config'
import { queueService } from './service/queue.service'
import { startConsumers } from './queue'
import { logger } from './utils/logger'

const httpServer = http.createServer(trackingApi)

const uiPort = config.uiPort

analyticsApi.set('port', uiPort)

analyticsApi.get('/', (req, res) => {
  res.sendFile(path.resolve('public/index.html'))
})

analyticsApi.use(express.static(path.resolve('public')))

analyticsApi.get('*', (req, res) => {
  res.sendFile(path.resolve('public/index.html'))
})

const graphqlServer = http.createServer(analyticsApi)

const start = async () => {
  logger.info('Connecting to db')

  try {
    await createDbConnection()
  } catch (err) {
    logger.error('Error while trying to connect to db: ', err)
    process.exit(1)
  }

  logger.info('Successfully connected to db')

  if (config.tracingApiEnabled || config.backgroundJobsEnabled) {
    try {
      await queueService.connect()
    } catch (err) {
      logger.error('Error while trying to connect to the queue: ', err)
      process.exit(1)
    }
  }

  logger.info('Successfully connected to the queue')

  if (config.tracingApiEnabled) {
    const trackingPort = config.trackingPort

    httpServer.listen(trackingPort, () => {
      logger.info(`Tracking handler listening on port ${trackingPort}`)
    })
  }

  if (config.uiEnabled) {
    graphqlServer.listen(uiPort, () => {
      logger.info(`UI app listening on port ${uiPort}`)
    })
  }

  if (config.backgroundJobsEnabled) {
    startCronJobs()
    await startConsumers()
  }
}

start()
