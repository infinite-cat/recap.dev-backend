import express from 'express'
import { json } from 'body-parser'
import { routes } from './routes'

const app = express()

app.use(json({ limit: '10mb' }))

routes(app)

export { app as trackingApi }
