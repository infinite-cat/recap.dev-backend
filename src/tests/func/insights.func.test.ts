import fetch from 'node-fetch'
import { DateTime } from 'luxon'
import { getConnection } from 'typeorm'

import { fillTestData, delay } from '../../utils/test.utils'
import { createDbConnection } from '../../db/pg'
import { unitService } from '../../service'

describe('insights queries tests', () => {
  jest.setTimeout(60_000)

  afterAll(async () => {
    const connection = getConnection()

    await connection.query('delete from unit_errors where unit_name = $1', ['recap.dev-backend-func-test-unit-insights'])
    await connection.query('delete from traces where unit_name = $1', ['recap.dev-backend-func-test-unit-insights'])
    await connection.query('delete from units where name = $1', ['recap.dev-backend-func-test-unit-insights'])

    await connection.close()
  })

  const startDateTime = DateTime.utc().minus({ hours: 23 }).startOf('hour')

  beforeAll(async () => {
    await createDbConnection()

    await fillTestData('recap.dev-backend-func-test-unit-insights', startDateTime)

    await delay(5000)

    // TODO: split into two different tests
    await unitService.recalculateUnitsStats(startDateTime.toMillis())
  })

  test('happy path', async () => {
    const response = await fetch('http://localhost:8081/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: `
        {
            getInsights(from: "${startDateTime.toMillis()}", to: "${DateTime.utc().toMillis()}") {
                type
                detailsLink
                message
            }
        }
      `,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const responseJson = await response.json()

    const insights = responseJson.data.getInsights

    expect(insights).toBeTruthy()
    expect(insights.length).toBe(1)
    expect(insights[0]).toEqual({
      type: 'ERROR',
      detailsLink: '/units/recap.dev-backend-func-test-unit-insights',
      message: 'High error rate (40%) in unit recap.dev-backend-func-test-unit-insights',
    })
  })
})
