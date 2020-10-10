import { chain } from 'lodash'

import { RawTrace } from '../../entity/raw-trace'
import { FunctionCall, ResourceAccessEvent, Trace } from '../../entity/trace'
import { StoredTrace } from '../../entity/pg'
import { ErrorReportData } from '../../entity/error-report-data'

export interface GetTracesResponse {
  traces: Trace[]
  hasMore: boolean
}

export abstract class AbstractTraceService {
  abstract addTrace(rawTrace: RawTrace): Promise<void>

  abstract getTraces(search: string, offset: number): Promise<GetTracesResponse>

  abstract saveTraces(traces: StoredTrace[]): Promise<StoredTrace[]>

  abstract getTrace(id: string): Promise<Trace>

  abstract getTotalStats(from: number, to: number): Promise<any>

  abstract getTracesWithoutError(): Promise<StoredTrace[]>

  abstract getNotEnrichedTraces(): Promise<StoredTrace[]>

  abstract getErrorReport(since: number): Promise<ErrorReportData[]>

  processRawTrace = (rawTrace: RawTrace) => {
    const functionCallEvents: FunctionCall[] = rawTrace.functionCallEvents

    const resourceAccessEvents: ResourceAccessEvent[] = chain(rawTrace.resourceAccessEvents)
      .map((call) => ({
        start: call.start,
        end: call.end,
        serviceName: call.serviceName,
        resourceIdentifier: JSON.stringify(call.resourceIdentifier),
        request: JSON.stringify(call.request),
        response: JSON.stringify(call.response),
        status: call.status,
        error: call.error,
      }))
      .value()

    const start = rawTrace.start || chain(functionCallEvents)
      .map('start')
      .min()
      .value()

    const end = rawTrace.end || chain(functionCallEvents)
      .map('end')
      .max()
      .value()

    return {
      id: rawTrace.id,
      unitName: rawTrace.unitName,
      status: rawTrace.status,
      request: JSON.stringify(rawTrace.request),
      response: JSON.stringify(rawTrace.response),
      error: rawTrace.error,
      logs: JSON.stringify(rawTrace.logs),
      start,
      end,
      duration: Number(end) - Number(start),
      functionCallEvents,
      resourceAccessEvents,
    }
  }
}
