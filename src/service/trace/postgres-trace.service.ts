import { map, reduce, isEmpty } from 'lodash'
import { Like, getConnection, MoreThanOrEqual, In } from 'typeorm'
import { DateTime } from 'luxon'

import { RawTrace } from '../../entity/raw-trace'
import { Trace } from '../../entity/trace'
import { AbstractTraceService } from './trace.service'
import { StoredTrace } from '../../entity/pg'
import { fillTimeSeriesGaps } from '../../utils/timeseries.utils'
import { queueService } from '../queue.service'

export class PostgresTraceService extends AbstractTraceService {
  addTrace = async (rawTrace: RawTrace) => {
    await queueService.enqueueNewTrace(rawTrace)
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

  async getTotalStats(from: number, to: number) {
    const connection = getConnection()

    const dataPoints = await connection.query(`
          select
             sum(invocations) as invocations,
             sum(errors) AS errors,
             EXTRACT(EPOCH FROM date_trunc('hour', TO_TIMESTAMP("datetime" / 1000))) * 1000 as "dateTime"
      from unit_stats
      where 
            EXTRACT(EPOCH FROM date_trunc('hour', TO_TIMESTAMP("datetime" / 1000))) * 1000 >= $1 
        and EXTRACT(EPOCH FROM date_trunc('hour', TO_TIMESTAMP("datetime" / 1000))) * 1000 <= $2
      group by "dateTime"
      order by "dateTime" desc
      `, [from, to])

    const startDateTime = DateTime.fromMillis(from)
    const endDateTime = DateTime.fromMillis(to)

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

  public async getNotEnrichedTraces(limit = 500, offset = 0, cutoffDateTime: DateTime = DateTime.utc().minus({ minutes: 5 })): Promise<StoredTrace[]> {
    const connection = getConnection()

    return connection
      .getRepository(StoredTrace)
      .find({
        select: ['id', 'externalId', 'start', 'end', 'extraData', 'logs', 'enriched', 'status', 'error', 'unitName'],
        where: {
          enriched: false,
          start: MoreThanOrEqual(cutoffDateTime.toMillis().toString()),
        },
        order: {
          unitName: 'DESC',
          start: 'DESC',
        },
        relations: ['unit'],
        take: limit,
        skip: offset,
      })
  }

  public async saveTraces(traces:StoredTrace[]): Promise<StoredTrace[]> {
    return getConnection().getRepository(StoredTrace).save(traces)
  }
}
