import { cloudWatchLogsService } from './cloud-watch-logs.service'

describe('cloudwatch-log.service.ts', () => {
  test('getLambdaLogs', async () => {
    const logs = await cloudWatchLogsService.getLambdaLogs(
      'dev-recap-dev-example-project-mysql-select',
      ['2020/07/12/[$LATEST]0f5bd277c5e94bddaf25623d636f01af'],
      1594563307579,
      1594563308579,
      'us-east-1',
    )

    expect(logs?.length).toBe(6)

    for (const log of logs) {
      expect(log).toEqual({
        timestamp: expect.any(Number),
        message: expect.any(String),
      })
    }
  })

  test('getLambdaLogsBatch', async () => {
    const request1 = {
      requestId: 'a3289d41-b6be-4dc7-8afb-c573cc988bd9',
      lambdaName: 'dev-recap-dev-example-project-mysql-select',
      logStreamName: '2020/07/12/[$LATEST]0f5bd277c5e94bddaf25623d636f01af',
      startTime: 1594563307579,
      endTime: 1594563308579,
      region: 'us-east-1',
    }

    const request2 = {
      requestId: 'cb6d4676-67ef-4e32-95f8-baa082d34a25',
      lambdaName: 'dev-recap-dev-example-project-mysql-select',
      logStreamName: '2020/07/25/[$LATEST]8de286b3bcca4a17adff797a227fc735',
      startTime: 1595652989436,
      endTime: 1595652989858,
      region: 'us-east-1',
    }

    const responseMap = await cloudWatchLogsService.getLambdaLogsBatch([request1, request2])

    const request1Logs = responseMap.get(JSON.stringify(request1))!

    expect(request1Logs).toBeTruthy()
    expect(request1Logs.length).toBe(5)

    for (const log of request1Logs) {
      expect(log).toEqual({
        timestamp: expect.any(Number),
        message: expect.any(String),
      })
    }

    const request2Logs = responseMap.get(JSON.stringify(request2))!

    expect(request2Logs).toBeTruthy()
    expect(request2Logs.length).toBe(5)

    for (const log of request2Logs) {
      expect(log).toEqual({
        timestamp: expect.any(Number),
        message: expect.any(String),
      })
    }
  })
})
