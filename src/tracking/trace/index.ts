import { Router } from 'express'
import { traceService } from '../../service'

export const traceRouter = Router()

traceRouter.post('/', (req, res) => {
  res.status(200)
  res.end()

  const newTrace = req.body

  traceService.addTrace(newTrace)
})
