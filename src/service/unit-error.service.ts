import { getConnection, MoreThanOrEqual, LessThanOrEqual } from 'typeorm'
import { map, isEmpty, chain, groupBy } from 'lodash'
import { DateTime } from 'luxon'

import { UnitError, StoredTrace, Unit, UnitErrorStats } from '../entity/pg'
import { fillTimeSeriesGaps, startOf5MinuteInterval } from '../utils/timeseries.utils'
import { logger } from '../utils/logger'
import { ErrorReportData } from '../entity/error-report-data'
import { escapeLiteral } from '../utils/db.utils'

export class UnitErrorService {
  public async getErrors(from: number, to: number, offset: number = 0) {
    const connection = getConnection()

    const errors = await connection
      .getRepository(UnitError)
      .createQueryBuilder('unitError')
      .orderBy({
        last_event_datetime: 'DESC',
      })
      .offset(offset)
      .limit(20)
      .getMany()

    if (isEmpty(errors)) {
      return {
        hasMore: false,
        errors: [],
        offset,
      }
    }

    const errorIds = map(errors, 'id')

    const graphStats = await connection.query(`
      select 
             sum(occurrences) as value, 
             unit_error_id, 
             floor(unit_error_stats.datetime / (3600 * 1000)) * 3600 * 1000 as "dateTime"
      from unit_error_stats
      where unit_error_id in (${errorIds.join(',')}) 
      and floor(unit_error_stats.datetime / (3600 * 1000)) * 3600 * 1000 >= $1 
      and floor(unit_error_stats.datetime / (3600 * 1000)) * 3600 * 1000 <= $2
      group by unit_error_id, "dateTime"
      order by "dateTime" desc
    `, [from, to])

    const startDateTime = DateTime.fromMillis(from)
    const endDateTime = DateTime.fromMillis(to)

    const graphStatsMap = chain(graphStats)
      .groupBy('unit_error_id')
      .value()

    return {
      errors: map(errors, (error) => {
        const errorGraphStats = graphStatsMap[Number(error.id)] || []
        return this.storedErrorToGraphqlType(error, fillTimeSeriesGaps(errorGraphStats, startDateTime, endDateTime))
      }),
      hasMore: errors.length === 20,
      offset: offset + errors.length,
    }
  }

  public async getNewErrors(from: number, to: number) {
    const connection = getConnection()

    const errors = await connection
      .getRepository(UnitError)
      .createQueryBuilder('unitError')
      .where({
        firstEventDateTime: MoreThanOrEqual(new Date(from)),
      })
      .andWhere({
        // @ts-ignore
        firstEventDateTime: LessThanOrEqual(new Date(to)),
      })
      .orderBy({
        first_event_datetime: 'DESC',
      })
      .limit(20)
      .getMany()

    return errors.map((error: any) => ({
      ...error,
      rawError: JSON.stringify(error.rawError),
    }))
  }

  public getError = async (id: number) => {
    const connection = getConnection()

    const error = await connection.getRepository(UnitError).findOne(id)

    if (!error) {
      return null
    }

    return this.storedErrorToGraphqlType(error)
  }

  public getErrorStats = async (id: number, from: number, to: number) => {
    const connection = getConnection()

    const error = await connection.getRepository(UnitError).findOne(id)

    if (!error) {
      return []
    }

    const graphStats = await connection.query(`
      select 
        coalesce("currentErrors",0) as "currentErrors",
        coalesce(invocations, 0) as invocations,
        coalesce(errors, 0) as errors,
        ues."dateTime"
      from (
                        select sum(occurrences)                                               AS "currentErrors",
                               floor(unit_error_stats.datetime / (3600 * 1000)) * 3600 * 1000 as "dateTime"
                        from unit_error_stats
                        where unit_error_id = $1
                          and unit_error_stats.datetime >= $3
                        group by "dateTime"
                        order by "dateTime" desc
                    ) ues
      left join (
          select coalesce(sum(invocations), 0)                 as invocations,
                 coalesce(sum(errors), 0)                      AS errors,
                 floor(datetime / (3600 * 1000)) * 3600 * 1000 as "dateTime"
          from unit_stats
          where unit_name = $2
            and datetime >= $3 and datetime <=$4
          group by "dateTime"
      ) us on ues."dateTime" = us."dateTime"
    `, [id, error.unitName, from, to])

    const startDateTime = DateTime.fromMillis(from)
    const endDateTime = DateTime.fromMillis(to)

    const fullGraphStats = fillTimeSeriesGaps(graphStats, startDateTime, endDateTime, {
      errors: 0,
      invocations: 0,
      currentErrors: 0,
    })

    return fullGraphStats
  }

  private storedErrorToGraphqlType(error: UnitError, graphStats?: any[]) {
    return {
      ...error,
      graphStats,
      rawError: JSON.stringify(error.rawError),
      lastEventDateTime: error.lastEventDateTime.getTime().toString(),
    }
  }

  public async analyzeTraces(traces: StoredTrace[]) {
    const connection = getConnection()

    for (const trace of traces) {
      try {
        const { name, message } = trace.error!

        let error = await connection.getRepository(UnitError).findOne({ unit: { name: trace.unitName }, type: name, message })

        if (!error) {
          error = await connection
            .getRepository(UnitError)
            .save(new UnitError({
              type: name,
              message,
              unit: new Unit({ name: trace.unitName }),
              lastEventDateTime: new Date(Number(trace.end)),
              firstEventDateTime: new Date(Number(trace.end)),
              rawError: trace.error,
            }))
        } else if (Number(trace.end) > error.lastEventDateTime.getDate()) {
          error.lastEventDateTime = new Date(Number(trace.end))
          error.rawError = trace.error!
          await connection
            .getRepository(UnitError)
            .save(error)
        }

        trace.unitError = error
        await connection.getRepository(StoredTrace).save(trace)
      } catch (e) {
        logger.error('Error analyzing trace error ', trace, e)
      }
    }
  }

  public async getErrorReports(ids: number[]): Promise<ErrorReportData[]> {
    const connection = getConnection()

    const idsParameter = ids.map((id) => escapeLiteral(id.toString())).join(',')

    const datas = await connection
      .query(`
          select 
            unit_errors.id, 
            unit_errors.raw_error as error, 
            unit_errors.unit_name, 
            max(coalesce(unit_error_stats.occurrences, 1)) as occurrences, 
            max(traces.id) as last_trace_id
          from unit_errors
          inner join traces on unit_errors.id = traces.unit_error_id
          left join (
              select unit_error_id, sum(occurrences) as occurrences 
              from unit_error_stats 
              where unit_error_id in (${idsParameter}) 
                    and datetime >= extract(epoch from (current_timestamp - interval '1 day')) * 1000
              group by unit_error_id
          ) unit_error_stats on unit_error_stats.unit_error_id = unit_errors.id
          where unit_errors.id in (${idsParameter})
          group by unit_errors.id
      `)

    return map(datas, (data) => ({
      lastTraceId: data.last_trace_id,
      unitName: data.unit_name,
      error: data.error,
      last24HoursOccurrences: data.occurrences,
    }))
  }

  public async recalculateErrorStats(since: number) {
    const connection = getConnection()

    const stats = await connection.query(`
        select unit_errors.id as "unitErrorId",
               coalesce(count(traces), 0)                        as occurrences,
               floor("end" / (300 * 1000)) * 300 * 1000          as "dateTime"
        from unit_errors
        left join traces on unit_errors.id = traces.unit_error_id
        where start >= $1
        group by "unitErrorId", "dateTime"
    `, [since])

    const errorsStatsMap = groupBy(stats, 'unitErrorId')

    const startDateTime = startOf5MinuteInterval(DateTime.fromMillis(since))
    const endDateTime = startOf5MinuteInterval(DateTime.utc())

    const newStats = []

    for (const unitErrorId of Object.keys(errorsStatsMap)) {
      const unitStats = errorsStatsMap[unitErrorId]

      const fullUnitStats = fillTimeSeriesGaps(unitStats, startDateTime, endDateTime, {
        unitErrorId,
        occurrences: 0,
      }, 300 * 1000)

      newStats.push(...fullUnitStats)
    }

    if (isEmpty(newStats)) {
      return
    }

    await connection.getRepository(UnitErrorStats)
      .createQueryBuilder()
      .insert()
      .values(newStats)
      .onConflict('(unit_error_id, datetime) do update set occurrences = EXCLUDED.occurrences')
      .execute()
  }
}


export const unitErrorService = new UnitErrorService()
