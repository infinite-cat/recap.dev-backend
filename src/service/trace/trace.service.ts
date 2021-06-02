import { chain } from 'lodash'

import { RawTrace } from '../../entity/raw-trace'
import { FunctionCall, ResourceAccessEvent, Trace } from '../../entity/trace'
import { StoredTrace } from '../../entity/pg'

export interface GetTracesResponse {
  traces: Trace[]
  hasMore: boolean
}

export abstract class AbstractTraceService {
  abstract addTrace(rawTrace: RawTrace): Promise<void>

  abstract getTraces(search: string, offset: number): Promise<GetTracesResponse>

  abstract getTrace(id: string): Promise<Trace>

  abstract getTotalStats(from: number, to: number): Promise<any>

  abstract getNotEnrichedTraces(): Promise<StoredTrace[]>

  abstract saveTraces(traces: StoredTrace[]): Promise<StoredTrace[]>

  isValidTrace = (trace: StoredTrace) => (
    // TODO: Rework to use a validation library and validate more fields
    !(!trace.end || !trace.start)
  )

  processRawTrace = (rawTrace: RawTrace): StoredTrace | null => {
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

    const trace = {
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

    const storedTrace = new StoredTrace({
      ...trace,
      id: undefined,
      externalId: trace.id,
      unit: {
        name: trace.unitName,
        type: rawTrace.unitType,
      },
      functionCallEvents: JSON.stringify(trace.functionCallEvents),
      resourceAccessEvents: JSON.stringify(trace.resourceAccessEvents),
      extraData: rawTrace.extraData,
      error: rawTrace.error && JSON.parse(rawTrace.error),
    })

    if (this.isValidTrace(storedTrace)) {
      return storedTrace
    }

    return null
  }
}
