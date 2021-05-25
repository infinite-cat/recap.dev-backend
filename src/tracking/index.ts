import express from 'express'
import { json } from 'body-parser'
import { routes } from './routes'

const app = express()

app.use(json({ limit: '1mb' }))

routes(app)

export { app as trackingApi }
