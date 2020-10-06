import { DateTime } from 'luxon'
import { getConnection } from 'typeorm'

import { createDbConnection } from '../db/pg/connection'
import { StoredTrace, Unit, UnitError, UnitErrorStats } from '../entity/pg'
import { startOf5MinuteInterval } from '../utils/timeseries.utils'
import { unitErrorService } from './unit-error.service'
import { traceService } from './trace'

describe('unit-error-service', () => {
  jest.setTimeout(60_000)

  beforeAll(async () => {
    await createDbConnection()
  })

  afterAll(async () => {
    const connection = getConnection()

    await connection.query('delete from units where name = $1', ['unit-error-service-test-unit'])

    await connection.close()
  })

  test('should aggregate stats', async () => {
    const sinceDateTime = DateTime.utc().minus({ hours: 1 })
    const dataPeriodStart = startOf5MinuteInterval(sinceDateTime.plus({ minutes: 5 }))

    const unit = {
      name: 'unit-error-service-test-unit',
    }

    await getConnection()
      .getRepository(Unit)
      .save(unit)

    const traces: Partial<StoredTrace>[] = [{
      externalId: 'unit-service-test-unit-1',
      unitName: 'unit-error-service-test-unit',
      status: 'OK',
      functionCallEvents: '',
      resourceAccessEvents: '',
      start: sinceDateTime.plus({ minutes: 4, seconds: 20 }).toMillis().toString(),
      end: sinceDateTime.plus({ minutes: 4, seconds: 30 }).toMillis().toString(),
      duration: 20000,
    }, {
      externalId: 'unit-service-test-unit-2',
      unitName: 'unit-error-service-test-unit',
      status: 'ERROR',
      error: { name: 'LambdaTimeoutError', message: 'Task timed out' },
      functionCallEvents: '',
      resourceAccessEvents: '',
      start: sinceDateTime.plus({ minutes: 4, seconds: 20 }).toMillis().toString(),
      end: sinceDateTime.plus({ minutes: 4, seconds: 30 }).toMillis().toString(),
      duration: 20000,
    }, {
      externalId: 'unit-service-test-unit-3',
      unitName: 'unit-error-service-test-unit',
      status: 'OK',
      functionCallEvents: '',
      resourceAccessEvents: '',
      start: sinceDateTime.plus({ minutes: 4, seconds: 20 }).toMillis().toString(),
      end: sinceDateTime.plus({ minutes: 4, seconds: 30 }).toMillis().toString(),
      duration: 20000,
    }]

    await getConnection()
      .getRepository(StoredTrace)
      .save(traces)

    const tracesToAnalyze = await traceService.getTracesWithoutError(100, 0, sinceDateTime)
    await unitErrorService.analyzeTraces(tracesToAnalyze)

    await unitErrorService.recalculateErrorStats(sinceDateTime.toMillis())

    const error = await getConnection()
      .getRepository(UnitError)
      .findOne({ unitName: 'unit-error-service-test-unit' })

    const stats = await getConnection()
      .getRepository(UnitErrorStats)
      .find({ unitErrorId: error!.id })

    expect(stats.length).toBe(13)

    for (const dataPoint of stats) {
      if (dataPoint.dateTime.toString() === dataPeriodStart.toMillis().toString()) {
        expect(dataPoint).toEqual({
          unitErrorId: error!.id,
          dateTime: expect.any(String),
          occurrences: '1',
        })
      } else {
        expect(dataPoint).toEqual({
          unitErrorId: error!.id,
          dateTime: expect.any(String),
          occurrences: '0',
        })
      }
    }
  })
})
