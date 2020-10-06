import { map, reduce, isEmpty } from 'lodash'
import { Like, getConnection, IsNull, Not, MoreThanOrEqual, In } from 'typeorm'
import { DateTime } from 'luxon'

import { RawTrace } from '../../entity/raw-trace'
import { Trace } from '../../entity/trace'
import { AbstractTraceService } from './trace.service'
import { StoredTrace } from '../../entity/pg'
import { fillTimeSeriesGaps } from '../../utils/timeseries.utils'
import { unitService } from '../unit.service'
import { ErrorReportData } from '../../entity/error-report-data'

export class PostgresTraceService extends AbstractTraceService {
  addTrace = async (rawTrace: RawTrace) => {
    const trace = this.processRawTrace(rawTrace)

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

    const connection = getConnection()

    await unitService.createUnit(storedTrace.unit.name, rawTrace.unitType)

    await connection.getRepository(StoredTrace).save(storedTrace)
  }

  storedTraceToTrace = (storedTrace: StoredTrace): Trace => ({
    ...storedTrace,
    error: storedTrace.error && JSON.stringify(storedTrace.error),
    extraData: JSON.stringify(storedTrace.extraData),
    unitName: storedTrace.unitName,
    functionCallEvents: JSON.parse(storedTrace.functionCallEvents),
    resourceAccessEvents: JSON.parse(storedTrace.resourceAccessEvents),
  })

  getTraces = async (search: string = '', offset: number = 0, limit: number = 20, unitName?: string, unitErrorId?: number, statuses?: string[]) => {
    const connection = getConnection()

    const dynamicCriteria: any = {}

    if (statuses && !isEmpty(statuses)) {
      dynamicCriteria.status = In(statuses)
    }

    if (unitName) {
      dynamicCriteria.unitName = unitName
    }

    if (unitErrorId) {
      dynamicCriteria.unitError = {
        id: unitErrorId,
      }
    }

    const criterias = [{
      externalId: Like(`%${search}%`),
      ...dynamicCriteria,
    }, {
      logs: Like(`%${search}%`),
      ...dynamicCriteria,
    }]

    if (!unitName) {
      criterias.push({
        unitName: Like(`%${search}%`),
        ...dynamicCriteria,
      })
    }

    const storedTraces = await connection
      .getRepository(StoredTrace)
      .createQueryBuilder('trace')
      .where(criterias)
      .orderBy({
        start: 'DESC',
        id: 'DESC',
      })
      .offset(offset)
      .limit(limit)
      .getMany()

    return {
      traces: map(storedTraces, this.storedTraceToTrace),
      hasMore: storedTraces.length === 20,
      offset: offset + storedTraces.length,
    }
  }

  getTrace = async (id: string): Promise<Trace> => {
    const connection = getConnection()

    const storedTrace = await connection.getRepository(StoredTrace).findOne(id)

    return this.storedTraceToTrace(storedTrace!)
  }

  async getTotalStats(since: number) {
    const connection = getConnection()

    const dataPoints = await connection.query(`
          select
             sum(invocations) as invocations,
             sum(errors) AS errors,
             EXTRACT(EPOCH FROM date_trunc('hour', TO_TIMESTAMP("datetime" / 1000))) * 1000 as "dateTime"
      from unit_stats
      where "datetime" >= $1
      group by "dateTime"
      order by "dateTime" desc
      `, [since])

    const startDateTime = DateTime.fromMillis(since)
    const endDateTime = DateTime.utc().startOf('hour')

    const fullDataPoints = fillTimeSeriesGaps(dataPoints, startDateTime, endDateTime, {
      invocations: 0,
      errors: 0,
    })

    const totals = reduce(fullDataPoints, (acc, dataPoint) => ({
      invocations: acc.invocations + Number(dataPoint.invocations),
      errors: acc.errors + Number(dataPoint.errors),
    }), { invocations: 0, errors: 0 })

    return {
      invocations: totals.invocations,
      errors: totals.errors,
      errorRate: totals.invocations ? (totals.errors / totals.invocations) : 0,
      graphStats: fullDataPoints,
    }
  }

  public async getTracesWithoutError(limit = 500, offset = 0, cutoffDateTime: DateTime = DateTime.utc().minus({ minutes: 5 })): Promise<StoredTrace[]> {
    const connection = getConnection()

    return connection
      .getRepository(StoredTrace)
      .find({
        select: ['id', 'externalId', 'status', 'error'],
        where: {
          unitError: IsNull(),
          error: Not(IsNull()),
          start: MoreThanOrEqual(cutoffDateTime.toMillis().toString()),
        },
        take: limit,
        skip: offset,
      })
  }

  public async getNotEnrichedTraces(limit = 500, offset = 0, cutoffDateTime: DateTime = DateTime.utc().minus({ minutes: 5 })): Promise<StoredTrace[]> {
    const connection = getConnection()

    return connection
      .getRepository(StoredTrace)
      .find({
        select: ['id', 'externalId', 'start', 'end', 'extraData', 'logs', 'enriched', 'status', 'error'],
        where: {
          enriched: false,
          start: MoreThanOrEqual(cutoffDateTime.toMillis().toString()),
        },
        relations: ['unit'],
        take: limit,
        skip: offset,
      })
  }

  public async getErrorReport(since: number): Promise<ErrorReportData[]> {
    const connection = getConnection()

    const datas = await connection
      .query(`
          select traces.error, traces.unit_name, coalesce(error_stats.occurrences, 0) as occurrences, last_trace_id
          from traces
                   inner join
               (
                   select error ->> 'name' as error_name, error ->> 'message' as error_message, unit_name, count(*) as occurrences, max(traces.id) as last_trace_id
                   from traces
                   where "end" >= extract(epoch from (current_timestamp - interval '1 day')) * 1000 and error is not null
                   group by error ->> 'name', error ->> 'message', unit_name
               ) as error_stats
               on error_stats.unit_name = traces.unit_name and
                  error_stats.error_name = traces.error ->> 'name' and
                  error_stats.error_message = traces.error ->> 'message' and
                  traces.id = error_stats.last_trace_id
          where "end" > $1 and traces.error IS NOT NULL
      `, [since])

    return map(datas, (data) => ({
      lastTraceId: data.last_trace_id,
      unitName: data.unit_name,
      error: data.error,
      last24HoursOccurrences: data.occurrences,
    }))
  }

  public async saveTraces(traces:StoredTrace[]): Promise<StoredTrace[]> {
    return getConnection().getRepository(StoredTrace).save(traces)
  }
}
