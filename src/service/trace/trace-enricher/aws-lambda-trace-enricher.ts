import { isEmpty, chain, find, map } from 'lodash'

import { StoredTrace, Settings } from '../../../entity/pg'
import { cloudWatchLogsService } from '../../aws/cloud-watch-logs.service'
import { TraceEnricher } from './trace-enricher'
import { LambdaTimeoutError } from '../../aws/lambda-timeout-error'
import { errorToObject } from '../error-utils'

export class AwsLambdaTraceEnricher extends TraceEnricher {
  readonly unitType = 'AWS_LAMBDA'

  isEnabled = false

  public onSettingsUpdated(newSettings: Settings) {
    this.isEnabled = newSettings.isAwsIntegrationEnabled
  }

  public supports(trace: StoredTrace) {
    return this.isEnabled && this.unitType === trace.unit.type && trace?.extraData?.awsLogStreamName
  }

  async enrich(traces: StoredTrace[]): Promise<StoredTrace[]> {
    const logRequests = chain(traces)
      .map((trace) => ({
        requestId: trace.externalId,
        lambdaName: trace.unit.name,
        logStreamName: trace.extraData.awsLogStreamName,
        startTime: Number(trace.start),
        endTime: Number(trace.end),
        region: trace.extraData.awsRegion,
        accountId: trace.extraData.awsAccountId,
      }))
      .value()

    const logsMap = await cloudWatchLogsService.getLambdaLogsBatch(logRequests)

    return map(traces, (trace) => {
      const extraData = trace.extraData

      const logs = logsMap.get(JSON.stringify({
        requestId: trace.externalId,
        lambdaName: trace.unit.name,
        logStreamName: trace.extraData.awsLogStreamName,
        startTime: Number(trace.start),
        endTime: Number(trace.end),
        region: trace.extraData.awsRegion,
        accountId: trace.extraData.awsAccountId,
      }))

      const reportLine = find(logs, (line) => line.message.startsWith(`REPORT RequestId: ${trace.externalId}`))
      const timeoutLine = find(logs, (line) => line.message.includes(`${trace.externalId} Task timed out after`))

      if (isEmpty(logs) || !reportLine) {
        return trace
      }

      trace.enriched = true
      trace.logs = JSON.stringify(logs)

      const reportEntries = chain(reportLine.message)
        .split('\t')
        .filter((line) => line.includes(': '))
        .map((line) => {
          const [name, value] = line.split(': ')
          return {
            name,
            value: value.split(' ')[0],
          }
        })
        .value()

      extraData.maxMemoryUsed = find(reportEntries, { name: 'Max Memory Used' })?.value
      extraData.billedDuration = find(reportEntries, { name: 'Billed Duration' })?.value
      extraData.initDuration = find(reportEntries, { name: 'Init Duration' })?.value
      extraData.memorySize = find(reportEntries, { name: 'Memory Size' })?.value

      trace.extraData = extraData

      if (timeoutLine) {
        trace.error = errorToObject(new LambdaTimeoutError('Task timed out'), false)
        trace.status = 'ERROR'
      }

      return trace
    })
  }
}

export const awsLambdaTraceEnricher = new AwsLambdaTraceEnricher()
