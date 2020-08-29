import { CloudWatchLogs, STS } from 'aws-sdk'
import { chain, throttle, first, find, forEach, filter } from 'lodash'
import NodeCache from 'node-cache'
import PromisePool from '@supercharge/promise-pool'
import { logger } from '../../utils/logger'
import { errorToString } from '../trace/error-utils'

export interface CloudWatchLogEntry {
  timestamp: number
  message: string
}

const sts = new STS()

const getCurrentAccountId = throttle(async () => {
  const callerIdentity = await sts.getCallerIdentity().promise()

  return callerIdentity?.Account
}, 60_000, {
  trailing: false,
})

export interface GetCloudWatchLogsRequest {
  requestId: string
  lambdaName: string
  logStreamName: string
  startTime: number
  endTime: number
  region: string
  accountId?: string
}

export class CloudWatchLogsService {
  private credentialsCache = new NodeCache()

  private async getCloudwatchClient(region: string, accountId?: string) {
    const currentAccountId = await getCurrentAccountId()

    if (!accountId || currentAccountId === accountId) {
      return new CloudWatchLogs({ region })
    }

    const cacheCredentials = this.credentialsCache.get<STS.Credentials>(accountId)

    if (cacheCredentials) {
      return new CloudWatchLogs({
        region,
        credentials: {
          accessKeyId: cacheCredentials.AccessKeyId,
          secretAccessKey: cacheCredentials.SecretAccessKey,
          sessionToken: cacheCredentials.SessionToken,
        },
      })
    }

    const credentialsResponse = await sts.assumeRole({
      RoleArn: `arn:aws:iam::${accountId}:role/recap.dev-delegation`,
      RoleSessionName: `recap.dev-session-${Date.now()}`,
    }).promise()

    if (!credentialsResponse?.Credentials) {
      throw new Error(`Couldn't get AWS credentials for account: "${accountId}"`)
    }

    this.credentialsCache.set<STS.Credentials>(
      accountId,
      credentialsResponse.Credentials,
      (credentialsResponse.Credentials.Expiration.getTime() - Date.now()) / 1000,
    )

    return new CloudWatchLogs({
      region,
      credentials: {
        accessKeyId: credentialsResponse.Credentials.AccessKeyId,
        secretAccessKey: credentialsResponse.Credentials.SecretAccessKey,
        sessionToken: credentialsResponse.Credentials.SessionToken,
      },
    })
  }


  public async getLambdaLogsBatch(requests: GetCloudWatchLogsRequest[]): Promise<Map<string, CloudWatchLogEntry[]>> {
    const groupedRequests = chain(requests)
      .groupBy((request) => `${request.accountId}-${request.region}-${request.lambdaName}`)
      .values()
      .map((groupRequests) => {
        const firstRequest = first(groupRequests)!

        const logStreamNames = chain(groupRequests)
          .map('logStreamName')
          .uniq()
          .value()

        const startTime = chain(groupRequests)
          .map('startTime')
          .min()
          .value()

        const endTime = chain(groupRequests)
          .map('endTime')
          .max()
          .value()

        return {
          accountId: firstRequest.accountId,
          lambdaName: firstRequest.lambdaName,
          region: firstRequest.region,
          logStreamNames,
          startTime,
          endTime,
        }
      })
      .value()

    const responses = await PromisePool
      .withConcurrency(3)
      .for(groupedRequests)
      .process(async (request) => {
        const events = await this.getLambdaLogs(
          request.lambdaName,
          request.logStreamNames,
          request.startTime,
          request.endTime,
          request.region,
          request.accountId,
        )

        return {
          accountId: request.accountId,
          region: request.region,
          lambdaName: request.lambdaName,
          events,
        }
      })

    forEach(responses.errors, (error) => {
      logger.error('Error while getting logs for request', error.item, error)
    })

    const responsesMap = new Map<string, CloudWatchLogEntry[]>()

    for (const request of requests) {
      const response = find(responses.results, {
        accountId: request.accountId,
        region: request.region,
        lambdaName: request.lambdaName,
      })

      let startLogFound = false
      let lastLogFound = false
      let timeoutLogChecked = false

      const logs = filter(response.events, (event) => {
        if (event.timestamp < request.startTime - 100
          || event.timestamp > request.endTime + 100
          || !event.message.includes(request.requestId)) {
          return false
        }

        if (CloudWatchLogsService.isStartLog(event.message, request.requestId)) {
          startLogFound = true
          return true
        }

        if (!startLogFound) {
          return false
        }

        if (CloudWatchLogsService.isReportLog(event.message, request.requestId)) {
          lastLogFound = true
          return true
        }

        if (lastLogFound) {
          timeoutLogChecked = true
          return CloudWatchLogsService.isTimeoutLog(event.message, request.requestId)
        }

        return !timeoutLogChecked
      })

      responsesMap.set(JSON.stringify(request), logs)
    }

    return responsesMap
  }

  public async getLambdaLogs(lambdaName: string, logStreamNames: string[], startTime: number, endTime: number, region: string, accountId?: string): Promise<CloudWatchLogEntry[]> {
    const cloudwatch = await this.getCloudwatchClient(region, accountId)

    const events = []
    let nextToken: string | undefined

    do {
      const startRequestTime = Date.now()

      const response = await cloudwatch.filterLogEvents({
        logGroupName: `/aws/lambda/${lambdaName}`,
        logStreamNames,
        startTime: startTime - 2000,
        endTime: endTime + 2000,
      }).promise()

      logger.trace(`Getting logs for ${lambdaName}, ${JSON.stringify(logStreamNames)}, ${startTime}, ${endTime} took ${Date.now() - startRequestTime}ms`)

      if (response?.events) {
        events.push(...response.events)
      }
      nextToken = response.nextToken
    } while (nextToken)


    return chain(events)
      .map((logEvent) => ({
        timestamp: logEvent.timestamp!,
        message: logEvent.message!,
      }))
      .compact()
      .value()
  }


  public async testIntegration() {
    const cloudwatch = new CloudWatchLogs({ region: 'us-east-1' })

    try {
      await cloudwatch.describeLogGroups().promise()
    } catch (error) {
      return {
        success: false,
        error: errorToString(error),
      }
    }

    return {
      success: true,
    }
  }

  public static isStartLog(line: string, requestId: string) {
    return line.startsWith(`START RequestId: ${requestId} Version`)
  }

  public static isReportLog(line: string, requestId: string) {
    return line.startsWith(`REPORT RequestId: ${requestId}`)
  }

  public static isTimeoutLog(line: string, requestId: string) {
    return line.includes(`${requestId} Task timed out after`)
  }
}

export const cloudWatchLogsService = new CloudWatchLogsService()
