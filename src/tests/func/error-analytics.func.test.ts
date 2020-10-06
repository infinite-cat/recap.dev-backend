import fetch from 'node-fetch'
import { DateTime } from 'luxon'
import { getConnection } from 'typeorm'

import { delay, fillTestData } from '../../utils/test.utils'
import { createDbConnection } from '../../db/pg'
import { traceService } from '../../service/trace'
import { unitErrorService } from '../../service'

describe('error analysis tests', () => {
  jest.setTimeout(300_000)

  afterAll(async () => {
    const connection = getConnection()

    await connection.query('delete from unit_errors where unit_name = $1', ['recap.dev-backend-func-test-unit-errors'])
    await connection.query('delete from traces where unit_name = $1', ['recap.dev-backend-func-test-unit-errors'])
    await connection.query('delete from units where name = $1', ['recap.dev-backend-func-test-unit-errors'])

    await connection.close()
  })

  const startDateTime = DateTime.utc().minus({ hours: 23 }).startOf('hour')

  beforeAll(async () => {
    await createDbConnection()

    await fillTestData('recap.dev-backend-func-test-unit-errors', startDateTime)

    await delay(5_000)

    // TODO: split into two different tests
    const tracesToAnalyze = await traceService.getTracesWithoutError(100, 0,startDateTime)
    await unitErrorService.analyzeTraces(tracesToAnalyze)

    await unitErrorService.recalculateErrorStats(startDateTime.toMillis())
  })

  test('errors list graphql query', async () => {
    const response = await fetch('http://localhost:8081/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: `
        {
            getErrors(graphSince: "${startDateTime.toMillis()}", offset: 0) {
                errors {
                  id
                  unitName
                  type
                  message
                  lastEventDateTime
                  graphStats {
                    value
                    dateTime
                  }
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

    const errors = responseJson.data.getErrors.errors

    expect(errors).toBeTruthy()
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toEqual({
      id: expect.any(Number),
      unitName: 'recap.dev-backend-func-test-unit-errors',
      type: 'QueryFailedError',
      message: 'relation "test_non_existing_table" does not exist',
      lastEventDateTime: expect.any(String),
      graphStats: expect.any(Array),
    })

    expect(errors[0].graphStats.length).toBe(24)
  })

  test('single error graphql query', async () => {
    const listResponse = await fetch('http://localhost:8081/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: `
        {
            getErrors(graphSince: "${startDateTime.toMillis()}", offset: 0) {
                errors {
                  id
                  unitName
                  type
                  message
                  lastEventDateTime
                  graphStats {
                    value
                    dateTime
                  }
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

    const listResponseJson = await listResponse.json()

    const errors = listResponseJson.data.getErrors.errors

    const errorToFind = errors[0]

    const errorResponse = await fetch('http://localhost:8081/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: `
        {
            getError(id: "${errorToFind.id}") {
                  id
                  unitName
                  type
                  message
                  rawError
                  lastEventDateTime
            }
        }
      `,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const errorResponseJson = await errorResponse.json()

    const error = errorResponseJson.data.getError

    expect(error).toBeTruthy()

    expect(error).toEqual({
      id: expect.any(Number),
      unitName: 'recap.dev-backend-func-test-unit-errors',
      type: 'QueryFailedError',
      message: 'relation "test_non_existing_table" does not exist',
      rawError: '{"code":"42P01","file":"parse_relation.c","line":"1180","name":"QueryFailedError","query":"select * from test_non_existing_table","length":122,"message":"relation \\"test_non_existing_table\\" does not exist","routine":"parserOpenTable","position":"15","severity":"ERROR","parameters":[]}',
      lastEventDateTime: expect.any(String),
    })
  })

  test('single error stats graphql query', async () => {
    const listResponse = await fetch('http://localhost:8081/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: `
        {
            getErrors(graphSince: "${startDateTime.toMillis()}", offset: 0) {
                errors {
                  id
                  unitName
                  type
                  message
                  lastEventDateTime
                  graphStats {
                    value
                    dateTime
                  }
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

    const listResponseJson = await listResponse.json()

    const errors = listResponseJson.data.getErrors.errors

    const errorToFind = errors[0]

    const errorResponse = await fetch('http://localhost:8081/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: `
        {
            getErrorStats(since: "${startDateTime.toMillis()}", id: "${errorToFind.id}") {
              invocations
              errors
              currentErrors
              dateTime
            }
        }
      `,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const errorResponseJson = await errorResponse.json()

    const stats = errorResponseJson.data.getErrorStats

    expect(stats).toBeTruthy()

    expect(stats.length).toBe(24)

    stats.forEach((item: any) => {
      expect(item).toEqual({
        invocations: expect.any(Number),
        errors: expect.any(Number),
        currentErrors: expect.any(Number),
        dateTime: expect.any(String),
      })
    })
  })

  test('new errors graphql query', async () => {
    const response = await fetch('http://localhost:8081/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: `
        {
            getNewErrors(since: "${startDateTime.toMillis()}") {
              id
              unitName
              type
              message
              rawError
              firstEventDateTime
              lastEventDateTime
            }
        }
      `,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const responseJson = await response.json()

    const errors = responseJson.data.getNewErrors

    expect(errors).toBeTruthy()
    expect(errors.length).toBe(1)
    expect(errors[0]).toEqual({
      id: expect.any(Number),
      unitName: 'recap.dev-backend-func-test-unit-errors',
      type: 'QueryFailedError',
      message: 'relation "test_non_existing_table" does not exist',
      rawError: expect.any(String),
      lastEventDateTime: expect.any(String),
      firstEventDateTime: expect.any(String),
    })
  })
})
