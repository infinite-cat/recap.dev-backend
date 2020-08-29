// @ts-ignore
import express from 'serverless-express/express'
// @ts-ignore
import handler from 'serverless-express/handler'
import { json } from 'body-parser'
import { analyticsApi } from './graphql'
import { trackingApi } from './tracking'

const lambdaApp = express()

lambdaApp.use(json({ limit: '10mb' }))

lambdaApp.use('/tracking', trackingApi)
lambdaApp.use('/analytics', analyticsApi)

export const api = handler(lambdaApp)
