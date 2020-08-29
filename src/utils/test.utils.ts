/* eslint-disable import/no-extraneous-dependencies */
import { uuid } from 'uuidv4'
import fetch from 'node-fetch'
import { DateTime, Duration, Interval } from 'luxon'
import { flatMap, times } from 'lodash'
import { gzipSync } from 'zlib'

export const delay = (ms: number) => (
  new Promise((resolve) => setTimeout(resolve, ms))
)

export const trace = (partial?: any) => ({
  id: uuid(),
  unitName: 'recap.dev-func-test-unit',
  status: 'OK',
  request: { id: 'test-dynamodb-get' },
  response: { id: 'test-dynamodb-get', title: 'Testing the Tracing' },
  functionCallEvents: [{
    start: 1587248497709,
    fileName: '',
    functionName: 'handler',
    end: 1587248497899,
  }],
  resourceAccessEvents: [{
    start: 1587248497712,
    serviceName: 'dynamodb',
    resourceIdentifier: { tableName: 'recap.dev-example-project-posts' },
    request: {
      operation: 'getItem',
      key: { id: { S: 'test-dynamodb-get' } },
      requestId: 'GHIK613T2TDI6PE819N3UUD54NVV4KQNSO5AEMVJF66Q9ASUAAJG',
    },
    response: { statusCode: 200, item: { id: { S: 'test-dynamodb-get' }, title: { S: 'Testing the Tracing' } } },
    end: 1587248497898,
    status: 'OK',
  }],
  ...partial,
})

export const errorTrace = (partial?: any) => trace({
  status: 'ERROR',
  error: '{"message":"relation \\"test_non_existing_table\\" does not exist","name":"QueryFailedError","length":122,"severity":"ERROR","code":"42P01","position":"15","file":"parse_relation.c","line":"1180","routine":"parserOpenTable","query":"select * from test_non_existing_table","parameters":[]}',
  ...partial,
})

export const saveTraces = async (traces: any[]) => {
  for (const testTrace of traces) {
    const dataBuffer = gzipSync(Buffer.from(JSON.stringify(testTrace), 'utf-8'))

    await fetch('http://localhost:8080/traces', {
      method: 'POST',
      body: dataBuffer,
      headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
      },
    })
  }
}

export const fillTestData = async (unitName: string, startDateTime: DateTime) => {
  const intervals = Interval
    .fromDateTimes(startDateTime, DateTime.utc())
    .splitBy(Duration.fromMillis(3600 * 1000))

  const traces = flatMap(intervals, ((interval, index) => {
    const intervalErrors = index % 10
    const end = interval.end.toMillis()
    const start = interval.start.toMillis() + 10000

    return [
      ...times(intervalErrors, () => errorTrace({
        unitName,
        functionCallEvents: [{
          fileName: '',
          functionName: 'handler',
          start,
          end,
        }],
      })),
      ...times(10 - intervalErrors, () => trace({
        unitName,
        functionCallEvents: [{
          fileName: '',
          functionName: 'handler',
          start,
          end,
        }],
      })),
    ]
  }))

  await saveTraces(traces)
}
