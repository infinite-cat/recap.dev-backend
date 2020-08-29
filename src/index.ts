import express from 'express'
import http from 'http'
import path from 'path'

import { analyticsApi } from './graphql'
import { trackingApi } from './tracking'
import { startCronJobs } from './cron'
import { createDbConnection } from './db/pg/connection'

const trackingPort = 8080 || process.env.TRACKING_PORT

const httpServer = http.createServer(trackingApi)

const uiPort = 8081 || process.env.UI_PORT

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
  console.log('Connecting to db')
  try {
    await createDbConnection()
  } catch (err) {
    console.log('Error while trying to connect to db: ', err)
    process.exit(1)
  }
  console.log('Successfully connected to db')

  httpServer.listen(trackingPort, () => {
    console.log(`Tracking handler listening on port ${trackingPort}`)
  })

  graphqlServer.listen(uiPort, () => {
    console.log(`UI app listening on port ${uiPort}`)
  })

  startCronJobs()
}

start()
