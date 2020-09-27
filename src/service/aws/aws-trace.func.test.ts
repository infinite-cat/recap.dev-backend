import fetch from 'node-fetch'
import { getConnection } from 'typeorm'
import { DateTime } from 'luxon'

import { RawTrace } from '../../entity/raw-trace'
import { createDbConnection } from '../../db/pg'
import { delay } from '../../utils/test.utils'
import { StoredTrace } from '../../entity/pg'
import { settingsService } from '../settings.service'
import { enrichTraces, updateEnrichersSettings } from '../trace/trace-enricher'
import { traceService } from '../trace'

describe('aws trace test', () => {
  jest.setTimeout(150_000)

  afterAll(async () => {
    const connection = getConnection()

    await connection.query('delete from unit_errors where unit_name = $1', ['dev-recap-dev-example-project-mysql-select'])
    await connection.query('delete from traces where unit_name = $1', ['dev-recap-dev-example-project-mysql-select'])
    await connection.query('delete from units where name = $1', ['dev-recap-dev-example-project-mysql-select'])
    await connection.query('delete from unit_errors where unit_name = $1', ['dev-recap-dev-example-project-timeout'])
    await connection.query('delete from traces where unit_name = $1', ['dev-recap-dev-example-project-timeout'])
    await connection.query('delete from units where name = $1', ['dev-recap-dev-example-project-timeout'])

    await connection.close()
  })

  beforeAll(async () => {
    await createDbConnection()

    const settings = await settingsService.getSettings()

    if (!settings.isAwsIntegrationEnabled) {
      settings.isAwsIntegrationEnabled = true
    }

    await settingsService.setSettings({
      ...settings,
      notificationConfigurations: settings.notificationConfigurations && JSON.stringify(settings.notificationConfigurations),
    })
  })

  test('happy path', async () => {
    const trace: RawTrace = {
      id: '41f8adf6-2a33-454b-87db-3bab1b4b7cc4',
      unitName: 'dev-recap-dev-example-project-mysql-select',
      unitType: 'AWS_LAMBDA',
      status: 'OK',
      request: {},
      response: {},
      functionCallEvents: [{
        functionName: 'handler',
        fileName: 'lambda.js',
        start: '1592158624599',
        end: '1592158624767',
        status: 'OK',
      }],
      resourceAccessEvents: [],
      extraData: {
        awsRegion: 'us-east-1',
        awsLogStreamName: '2020/06/14/[$LATEST]4dea36ca9f7346b79f4b3cb42964d46d',
      },
    }

    const response = await fetch('http://localhost:8080/traces', {
      method: 'POST',
      body: JSON.stringify(trace),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(200)

    await delay(5_000)

    // TODO: Refactor to split into two separate tests

    await updateEnrichersSettings()
    console.log('Enriching new traces')
    const tracesToEnrich = await traceService.getNotEnrichedTraces(100, 0, DateTime.fromMillis(1592158624599))
    console.log(`There are ${tracesToEnrich.length} traces to enrich`)
    const enrichedTraces = await enrichTraces(tracesToEnrich)

    await traceService.saveTraces(enrichedTraces)

    const dbTrace = await getConnection().getRepository(StoredTrace).findOne({ externalId: '41f8adf6-2a33-454b-87db-3bab1b4b7cc4' })

    expect(dbTrace).toEqual({
      id: expect.any(Number),
      externalId: '41f8adf6-2a33-454b-87db-3bab1b4b7cc4',
      unitName: 'dev-recap-dev-example-project-mysql-select',
      status: 'OK',
      request: '{}',
      response: '{}',
      error: null,
      functionCallEvents: '[{"functionName":"handler","fileName":"lambda.js","start":"1592158624599","end":"1592158624767","status":"OK"}]',
      resourceAccessEvents: '[]',
      extraData: {
        awsRegion: 'us-east-1',
        awsLogStreamName: '2020/06/14/[$LATEST]4dea36ca9f7346b79f4b3cb42964d46d',
        memorySize: '512',
        initDuration: '1063.86',
        maxMemoryUsed: '154',
        billedDuration: '200',
      },
      duration: '168',
      start: '1592158624599',
      end: '1592158624767',
      enriched: true,
      logs: '[{"timestamp":1592158624596,"message":"START RequestId: 41f8adf6-2a33-454b-87db-3bab1b4b7cc4 Version: $LATEST\\n"},{"timestamp":1592158624754,"message":"2020-06-14T18:17:04.753Z\\t41f8adf6-2a33-454b-87db-3bab1b4b7cc4\\tINFO\\tsending took:  26  ms\\n"},{"timestamp":1592158624767,"message":"END RequestId: 41f8adf6-2a33-454b-87db-3bab1b4b7cc4\\n"},{"timestamp":1592158624767,"message":"REPORT RequestId: 41f8adf6-2a33-454b-87db-3bab1b4b7cc4\\tDuration: 171.38 ms\\tBilled Duration: 200 ms\\tMemory Size: 512 MB\\tMax Memory Used: 154 MB\\tInit Duration: 1063.86 ms\\t\\n"}]',
    })
  })

  test('timeout trace', async () => {
    const trace: RawTrace = {
      id: '19d66126-55dd-42f6-b5c2-3db03f1b09a1',
      unitName: 'dev-recap-dev-example-project-timeout',
      unitType: 'AWS_LAMBDA',
      status: 'ERROR',
      error: '{"name":"Error","message":"Lambda Invocation Timeout","stack":"Error: Lambda Invocation Timeout\\n    at new LambdaTimeoutError (webpack:///./node_modules/@recap.dev/client/dist/client.umd.js?:121074:46)\\n    at Timeout.eval [as _onTimeout] (webpack:///./node_modules/@recap.dev/client/dist/client.umd.js?:121236:44)\\n    at listOnTimeout (internal/timers.js:549:17)\\n    at processTimers (internal/timers.js:492:7)"}',
      request: {},
      response: {},
      functionCallEvents: [{
        functionName: 'handler',
        fileName: 'lambda.js',
        start: '1592741593035',
        end: '1592741598042',
        status: 'OK',
      }],
      resourceAccessEvents: [],
      extraData: {
        awsRegion: 'us-east-1',
        awsLogStreamName: '2020/06/21/[$LATEST]a38c7bdf4bdd4c63a8c06e921ec9c349',
      },
    }

    const response = await fetch('http://localhost:8080/traces', {
      method: 'POST',
      body: JSON.stringify(trace),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(200)

    await delay(5_000)

    // TODO: Refactor to split into two separate tests

    await updateEnrichersSettings()
    console.log('Enriching new traces')
    const tracesToEnrich = await traceService.getNotEnrichedTraces(100, 0, DateTime.fromMillis(1592158624599))
    console.log(`There are ${tracesToEnrich.length} traces to enrich`)
    const enrichedTraces = await enrichTraces(tracesToEnrich)

    await traceService.saveTraces(enrichedTraces)

    const dbTrace = await getConnection().getRepository(StoredTrace).findOne({ externalId: '19d66126-55dd-42f6-b5c2-3db03f1b09a1' })

    expect(dbTrace).toEqual({
      id: expect.any(Number),
      externalId: '19d66126-55dd-42f6-b5c2-3db03f1b09a1',
      unitName: 'dev-recap-dev-example-project-timeout',
      status: 'ERROR',
      request: '{}',
      response: '{}',
      error: { name: 'LambdaTimeoutError', message: 'Task timed out' },
      functionCallEvents: '[{"functionName":"handler","fileName":"lambda.js","start":"1592741593035","end":"1592741598042","status":"OK"}]',
      resourceAccessEvents: '[]',
      extraData: {
        awsRegion: 'us-east-1',
        awsLogStreamName: '2020/06/21/[$LATEST]a38c7bdf4bdd4c63a8c06e921ec9c349',
        memorySize: '512',
        initDuration: '671.99',
        maxMemoryUsed: '119',
        billedDuration: '5000',
      },
      duration: '5007',
      start: '1592741593035',
      end: '1592741598042',
      enriched: true,
      logs: '[{"timestamp":1592741593037,"message":"START RequestId: 19d66126-55dd-42f6-b5c2-3db03f1b09a1 Version: $LATEST\\n"},{"timestamp":1592741597896,"message":"2020-06-21T12:13:17.896Z\\t19d66126-55dd-42f6-b5c2-3db03f1b09a1\\tINFO\\tsending took:  46  ms\\n"},{"timestamp":1592741598042,"message":"END RequestId: 19d66126-55dd-42f6-b5c2-3db03f1b09a1\\n"},{"timestamp":1592741598042,"message":"REPORT RequestId: 19d66126-55dd-42f6-b5c2-3db03f1b09a1\\tDuration: 5005.15 ms\\tBilled Duration: 5000 ms\\tMemory Size: 512 MB\\tMax Memory Used: 119 MB\\tInit Duration: 671.99 ms\\t\\n"},{"timestamp":1592741598042,"message":"2020-06-21T12:13:18.042Z 19d66126-55dd-42f6-b5c2-3db03f1b09a1 Task timed out after 5.01 seconds\\n\\n"}]',
    })
  })
})
