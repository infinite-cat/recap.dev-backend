import { DateTime } from 'luxon'
import { getConnection } from 'typeorm'

import { unitService } from './unit.service'
import { createDbConnection } from '../db/pg'
import { StoredTrace, Unit, UnitStats } from '../entity/pg'
import { startOf5MinuteInterval } from '../utils/timeseries.utils'

describe('unit-service', () => {
  jest.setTimeout(60_000)

  beforeAll(async () => {
    await createDbConnection()
  })

  afterAll(async () => {
    const connection = getConnection()

    await connection.query('delete from units where name = $1', ['unit-service-test-unit'])

    await connection.close()
  })

  test('should aggregate stats', async () => {
    const sinceDateTime = DateTime.utc().minus({ hours: 1 })
    const dataPeriodStart = startOf5MinuteInterval(sinceDateTime.plus({ minutes: 5 }))

    const unit = {
      name: 'unit-service-test-unit',
    }

    await getConnection()
      .getRepository(Unit)
      .save(unit)

    const traces: Partial<StoredTrace>[] = [{
      externalId: 'unit-service-test-unit-1',
      unitName: 'unit-service-test-unit',
      status: 'OK',
      functionCallEvents: '',
      resourceAccessEvents: '',
      start: sinceDateTime.plus({ minutes: 4, seconds: 20 }).toMillis().toString(),
      end: sinceDateTime.plus({ minutes: 4, seconds: 30 }).toMillis().toString(),
      duration: 20000,
    }, {
      externalId: 'unit-service-test-unit-2',
      unitName: 'unit-service-test-unit',
      status: 'ERROR',
      functionCallEvents: '',
      resourceAccessEvents: '',
      start: sinceDateTime.plus({ minutes: 4, seconds: 20 }).toMillis().toString(),
      end: sinceDateTime.plus({ minutes: 4, seconds: 30 }).toMillis().toString(),
      duration: 20000,
    }, {
      externalId: 'unit-service-test-unit-3',
      unitName: 'unit-service-test-unit',
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

    await unitService.recalculateUnitsStats(sinceDateTime.toMillis())

    const stats = await getConnection()
      .getRepository(UnitStats)
      .find({ unitName: 'unit-service-test-unit' })

    expect(stats.length).toBe(13)

    for (const dataPoint of stats) {
      if (dataPoint.dateTime.toString() === dataPeriodStart.toMillis().toString()) {
        expect(dataPoint).toEqual({
          unitName: 'unit-service-test-unit',
          dateTime: expect.any(String),
          invocations: '3',
          errors: '1',
          errorRate: 0.3333333333333333,
          averageDuration: 20000,
        })
      } else {
        expect(dataPoint).toEqual({
          unitName: 'unit-service-test-unit',
          dateTime: expect.any(String),
          invocations: '0',
          errors: '0',
          errorRate: null,
          averageDuration: null,
        })
      }
    }
  })
})
