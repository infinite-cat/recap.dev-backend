import fetch from 'node-fetch'
import { DateTime } from 'luxon'
import { getConnection } from 'typeorm'

import { fillTestData, delay, trace, saveTraces } from '../../utils/test.utils'
import { createDbConnection } from '../../db/pg'
import { unitService } from '../../service'

describe('trace queries tests', () => {
  jest.setTimeout(60_000)

  afterAll(async () => {
    const connection = getConnection()

    await connection.query('delete from unit_errors where unit_name = $1', ['recap.dev-backend-func-test-unit-traces'])
    await connection.query('delete from traces where unit_name = $1', ['recap.dev-backend-func-test-unit-traces'])
    await connection.query('delete from units where name = $1', ['recap.dev-backend-func-test-unit-traces'])
    await connection.query('delete from unit_errors where unit_name = $1', ['test-logs-unit'])
    await connection.query('delete from traces where unit_name = $1', ['test-logs-unit'])
    await connection.query('delete from units where name = $1', ['test-logs-unit'])

    await connection.close()
  })

  const startDateTime = DateTime.utc().minus({ hours: 23 }).startOf('hour')

  beforeAll(async () => {
    await createDbConnection()

    await fillTestData('recap.dev-backend-func-test-unit-traces', startDateTime)

    await delay(5000)

    // TODO: split into two different tests
    await unitService.recalculateUnitsStats(startDateTime.toMillis())
  })

  test('get total stats happy path', async () => {
    const response = await fetch('http://localhost:8081/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: `
        {
            getTotalStats(since: "${startDateTime.toMillis()}") {
                invocations
                errors
                errorRate
                graphStats {
                  invocations
                  errors
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

    const stats = responseJson.data.getTotalStats

    expect(stats).toBeTruthy()
    expect(stats).toEqual({
      invocations: '240',
      errors: '96',
      errorRate: expect.any(Number),
      graphStats: expect.any(Array),
    })

    for (const dataPoint of stats.graphStats) {
      expect(dataPoint).toEqual({
        invocations: expect.any(String),
        errors: expect.any(String),
        dateTime: expect.any(String),
      })
    }

    expect(stats.graphStats.length).toBe(24)
  })

  test('search should find messages in logs', async () => {
    const searchTrace = trace({
      id: 'test-logs-search-trace-id',
      unitName: 'test-logs-unit',
      logs: 'log: error code 53463 occurred',
      functionCallEvents: [{
        fileName: '',
        functionName: 'handler',
        start: (startDateTime.toMillis() + 10_000).toString(),
        end: (startDateTime.toMillis() + 20_000).toString(),
      }],
    })

    await saveTraces([searchTrace])

    await delay(1_000)

    const response = await fetch('http://localhost:8081/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: `
        {
          getTraces(search: "53463") {
            traces {
              id
              externalId
              unitName
              start
              end
              duration
              status
              logs
              request
              response
              error
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

    const traces = responseJson.data.getTraces.traces

    expect(traces).toBeTruthy()
    expect(traces.length).toBeGreaterThan(0)
    expect(traces[0]).toEqual({
      id: expect.any(Number),
      externalId: 'test-logs-search-trace-id',
      unitName: 'test-logs-unit',
      start: (startDateTime.toMillis() + 10_000).toString(),
      end: (startDateTime.toMillis() + 20_000).toString(),
      duration: 10000,
      status: 'OK',
      logs: 'log: error code 53463 occurred',
      request: '{"id":"test-dynamodb-get"}',
      response: '{"id":"test-dynamodb-get","title":"Testing the Tracing"}',
      error: null,
    })
  })

  test('search should filter out only error logs', async () => {
    const searchTrace = trace({
      id: 'test-logs-search-trace-id',
      unitName: 'test-logs-unit',
      logs: 'log: error code 53463 occurred',
      functionCallEvents: [{
        fileName: '',
        functionName: 'handler',
        start: (startDateTime.toMillis() + 10_000).toString(),
        end: (startDateTime.toMillis() + 20_000).toString(),
      }],
    })

    await saveTraces([searchTrace])

    await delay(1_000)

    const response = await fetch('http://localhost:8081/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: `
        {
          getTraces(onlyErrors: true) {
            traces {
              id
              externalId
              unitName
              start
              end
              duration
              status
              logs
              request
              response
              error
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

    const traces = responseJson.data.getTraces.traces

    expect(traces).toBeTruthy()
    expect(traces.length).toBe(20)

    for (const errorTrace of traces) {
      expect(errorTrace).toEqual(expect.objectContaining({
        status: 'ERROR',
        error: '{"code":"42P01","file":"parse_relation.c","line":"1180","name":"QueryFailedError","query":"select * from test_non_existing_table","length":122,"message":"relation \\"test_non_existing_table\\" does not exist","routine":"parserOpenTable","position":"15","severity":"ERROR","parameters":[]}',
      }))
    }
  })
})
