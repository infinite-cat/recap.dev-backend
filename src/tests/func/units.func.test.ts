import fetch from 'node-fetch'
import { DateTime } from 'luxon'
import { getConnection } from 'typeorm'

import { delay, fillTestData, saveTraces, trace } from '../../utils/test.utils'
import { createDbConnection } from '../../db/pg'
import { unitService } from '../../service'

describe('units queries tests', () => {
  jest.setTimeout(60_000)

  afterAll(async () => {
    const connection = getConnection()

    await connection.query('delete from unit_errors where unit_name = $1', ['recap.dev-backend-func-test-unit-units'])
    await connection.query('delete from traces where unit_name = $1', ['recap.dev-backend-func-test-unit-units'])
    await connection.query('delete from units where name = $1', ['recap.dev-backend-func-test-unit-units'])
    await connection.query('delete from unit_errors where unit_name = $1', ['test-search-unit'])
    await connection.query('delete from traces where unit_name = $1', ['test-search-unit'])
    await connection.query('delete from units where name = $1', ['test-search-unit'])

    await connection.close()
  })

  const startDateTime = DateTime.utc().minus({ hours: 23 }).startOf('hour')

  beforeAll(async () => {
    await createDbConnection()

    await fillTestData('recap.dev-backend-func-test-unit-units', startDateTime)

    await delay(20000)

    // TODO: split into two different tests
    await unitService.recalculateUnitsStats(startDateTime.toMillis())
  })

  test('happy path', async () => {
    const response = await fetch('http://localhost:8081/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: `
        {
            getUnits(from: "${startDateTime.toMillis()}", to: "${DateTime.utc().toMillis()}", offset: 0) {
                units {
                  unitName
                  invocations
                  errors
                  errorRate
                }
                offset
                hasMore
            }
        }
      `,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const responseJson = await response.json()

    const units = responseJson.data.getUnits.units

    expect(units).toBeTruthy()
    expect(units.length).toBeGreaterThan(0)
    expect(units[0]).toEqual({
      unitName: 'recap.dev-backend-func-test-unit-units',
      invocations: expect.any(String),
      errors: expect.any(String),
      errorRate: expect.any(Number),
    })
  })

  test('get single unit', async () => {
    const response = await fetch('http://localhost:8081/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: `
        {
            getUnit(unitName: "recap.dev-backend-func-test-unit-units", from: "${startDateTime.toMillis()}", to: "${DateTime.utc().startOf('hour').toMillis()}") {
                unitName
                errorRate
                graphStats {
                  invocations
                  errors
                  averageDuration
                  dateTime
                }
            }
        }
      `,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const responseJson = await response.json()

    const unit = responseJson.data.getUnit

    expect(unit).toBeTruthy()
    expect(unit).toEqual({
      unitName: 'recap.dev-backend-func-test-unit-units',
      errorRate: expect.any(Number),
      graphStats: expect.any(Array),
    })

    for (const dataPoint of unit.graphStats) {
      expect(dataPoint).toEqual(expect.objectContaining({
        invocations: expect.any(String),
        errors: expect.any(String),
        dateTime: expect.any(String),
      }))
    }

    expect(unit.graphStats.length).toBe(24)
  })

  test('get total invoked units', async () => {
    const response = await fetch('http://localhost:8081/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: `
        {
            getTopInvokedUnits(from: "${startDateTime.toMillis()}", to: "${DateTime.utc().toMillis()}") {
                unitName
                invocations
                errors
            }
        }
      `,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const responseJson = await response.json()

    const units = responseJson.data.getTopInvokedUnits

    expect(units).toBeTruthy()
    expect(units.length).toBe(1)
    expect(units[0]).toEqual({
      unitName: 'recap.dev-backend-func-test-unit-units',
      invocations: '240',
      errors: '96',
    })
  })

  test('search should find a unit', async () => {
    const searchTrace = trace({
      unitName: 'test-search-unit',
      functionCallEvents: [{
        fileName: '',
        functionName: 'handler',
        start: (startDateTime.toMillis() + 10_000).toString(),
        end: (startDateTime.toMillis() + 20_000).toString(),
      }],
    })

    await saveTraces([searchTrace])

    await delay(20000)

    const response = await fetch('http://localhost:8081/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: `
        {
            getUnits(from: "${startDateTime.toMillis()}", to: "${DateTime.utc().toMillis()}", search: "search", offset: 0) {
                units {
                  unitName
                  invocations
                  errors
                  errorRate
                  averageDuration
                }
                offset
                hasMore
            }
        }
      `,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const responseJson = await response.json()

    const units = responseJson.data.getUnits.units

    expect(units).toBeTruthy()
    expect(units.length).toBeGreaterThan(0)
    expect(units[0]).toEqual({
      unitName: 'test-search-unit',
      invocations: expect.any(String),
      errors: expect.any(String),
      errorRate: null,
      averageDuration: null,
    })
  })
})
