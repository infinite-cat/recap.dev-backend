import { traceService, unitErrorService, unitService, insightService, settingsService } from '../../service'
import { cloudWatchLogsService } from '../../service/aws/cloud-watch-logs.service'
import { SlackService } from '../../service/notification/slack.service'
import { Settings } from '../../entity/pg'

export default {
  Query: {
    getTraces: (obj: any, args: any) => (
      traceService.getTraces(
        args.search,
        args.offset,
        args.limit,
        args.unitName,
        args.unitErrorId ? Number(args.unitErrorId) : undefined,
        args.status,
      )
    ),
    getTrace: (obj: any, args: any) => traceService.getTrace(args.id),
    getErrors: (obj: any, args: any) => unitErrorService.getErrors(Number(args.graphSince), args.offset),
    getError: (obj: any, args: any) => unitErrorService.getError(Number(args.id)),
    getErrorStats: (obj: any, args: any) => unitErrorService.getErrorStats(Number(args.id), Number(args.since)),
    getUnits: (obj: any, args: any) => unitService.getUnits(args.since, args.search, args.offset, args.orderBy, args.orderDirection),
    getUnit: (obj: any, args: any) => unitService.getUnit(args.unitName, Number(args.graphSince)),
    getInsights: (obj: any, args: any) => insightService.getInsights(Number(args.since)),
    getTotalStats: (obj: any, args: any) => traceService.getTotalStats(Number(args.since)),
    getNewErrors: (obj: any, args: any) => unitErrorService.getNewErrors(Number(args.since)),
    getTopInvokedUnits: (obj: any, args: any) => unitService.getTopInvokedUnits(Number(args.since)),
    getSettings: () => settingsService.getGraphqlSettings(),
  },
  Mutation: {
    setSettings: (obj: any, args: any) => settingsService.setSettings(args.settings),
    testAwsIntegration: () => cloudWatchLogsService.testIntegration(),
    testSlackIntegration: (obj: any, args: any) => new SlackService({ ...args }, new Settings()).testIntegration(),
  },
}
