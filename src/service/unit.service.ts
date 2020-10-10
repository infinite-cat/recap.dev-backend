import { DateTime } from 'luxon'
import { chain, groupBy, isEmpty } from 'lodash'
import { getConnection } from 'typeorm'

import { fillTimeSeriesGaps, startOf5MinuteInterval } from '../utils/timeseries.utils'
import { Unit, UnitStats } from '../entity/pg'
import { knex } from '../db/pg'
import { escapeLiteral } from '../utils/db.utils'

export class UnitService {
  public async getUnits(from: number, to: number, search: string = '', offset: number = 0, orderBy: string = 'invocations', orderDirection: string = 'DESC') {
    const connection = getConnection()

    const searchTerms = search.split(' ')

    const queryBuilder = knex.select(
      knex.raw('units.name as "unitName"'),
      knex.raw('estimated_cost as "estimatedCost"'),
      knex.raw('coalesce(sum(invocations), 0) as invocations'),
      knex.raw('coalesce(sum(errors), 0) AS errors'),
      knex.raw('case when sum(invocations) = 0 THEN NULL ELSE sum(errors) / sum(invocations) END as "errorRate"'),
      knex.raw('case when sum(invocations) = 0 THEN NULL ELSE sum(average_duration * invocations) / sum(invocations) END as "averageDuration"'),
    ).from('units')
      .leftJoin('unit_stats', (joinOnBuilder) => (
        joinOnBuilder.on('units.name', '=', 'unit_stats.unit_name'))
        .andOn('unit_stats.datetime', '>=', knex.raw('?', [from]))
        .andOn('unit_stats.datetime', '<=', knex.raw('?', [to])))

    for (const searchTerm of searchTerms) {
      queryBuilder.andWhere('units.name', 'like', `%${searchTerm}%`)
    }

    const orderDirectionStatement = knex.raw(`${orderDirection} nulls ${orderDirection === 'desc' ? 'last' : 'first'}`)

    queryBuilder.groupBy('name')
      .orderBy([{
        column: orderBy,
        // @ts-ignore
        order: orderDirectionStatement,
      }, {
        column: 'name',
        order: 'DESC',
      }])
      .limit(20)
      .offset(offset)

    const units = await connection.query(queryBuilder.toQuery())

    return {
      units,
      hasMore: units.length === 20,
      offset: offset + units.length,
    }
  }

  public async createUnit(unitName: string, type?: string) {
    const connection = getConnection()

    await connection.query('insert into units(name, type) values ($1, $2) ON CONFLICT (name) do nothing;', [unitName, type])
  }

  public async getTopInvokedUnits(from: number, to: number) {
    const connection = getConnection()

    return connection.query(`
        select name as "unitName",
               estimated_cost as "estimatedCost",
               sum(invocations) as invocations,
               sum(errors) as errors
        from units
        join unit_stats on (units.name = unit_stats.unit_name) and datetime >= $1 and datetime <= $2
        group by "unitName", "estimatedCost"
        order by "invocations" DESC
        limit 20 
    `, [from, to])
  }

  public getUnit = async (unitName: string, from: number, to: number) => {
    const connection = getConnection()

    const unit = await connection.getRepository(Unit).findOne(unitName)

    const graphStats = await connection.query(`
      select
             coalesce(sum(invocations), 0) as invocations,
             coalesce(sum(errors), 0) AS errors,
             case when sum(invocations) = 0 THEN NULL ELSE sum(average_duration * invocations) / sum(invocations) END as "averageDuration",
             floor(datetime / (3600 * 1000)) * 3600 * 1000 as "dateTime"
      from unit_stats
      where unit_name = $1 and "datetime" >= $2 and "datetime" <= $3
      group by "dateTime"
      order by "dateTime" desc
    `, [unitName, from, to])

    const startDateTime = DateTime.fromMillis(from)
    const endDateTime = DateTime.fromMillis(to)

    const fullGraphStats = fillTimeSeriesGaps(graphStats, startDateTime, endDateTime, {
      errors: 0,
      invocations: 0,
      averageDuration: 0,
    })

    const totals = chain(fullGraphStats)
      .reduce((acc, dataPoint) => {
        acc.invocations += Number(dataPoint.invocations)
        acc.errors += Number(dataPoint.errors)

        return acc
      }, {
        invocations: 0,
        errors: 0,
      }).value()

    return {
      unitName,
      estimatedCost: unit!.estimatedCost,
      errorRate: totals.errors / totals.invocations,
      graphStats: fullGraphStats,
    }
  }

  public async recalculateUnitsStats(since: number) {
    const connection = getConnection()

    const updatedUnits: any[] = await connection.query(`
      select distinct(units.name) as "unitName"
          from units
          join traces on units.name = traces.unit_name
          where start >= $1
    `, [since])

    const batches = chain(updatedUnits)
      .map('unitName')
      .chunk(20)
      .value()


    for (const batch of batches) {
      await this.recalculateUnitsStatsForUnits(since, batch)
    }
  }

  private async recalculateUnitsStatsForUnits(since: number, unitNames: string[]) {
    const connection = getConnection()

    const unitNamesParameter = unitNames.map(escapeLiteral).join(',')

    const stats = await connection.query(`
        select units.name as "unitName",
               coalesce(count(traces), 0)                        as invocations,
               sum(CASE WHEN status = 'ERROR' THEN 1 ELSE 0 END) as errors,
               avg(duration)                                     as "averageDuration",
               case
                   when count(traces) = 0 THEN NULL
                   ELSE (cast(sum(CASE WHEN status = 'ERROR' THEN 1 ELSE 0 END) as double precision) /
                         count(traces)) END                      as "errorRate",
               floor("end" / (300 * 1000)) * 300 * 1000          as "dateTime"
        from units
        left join traces on units.name = traces.unit_name
        where start >= $1 and units.name in (${unitNamesParameter})
        group by "unitName", "dateTime"
    `, [since])

    const unitsStatsMap = groupBy(stats, 'unitName')

    const startDateTime = startOf5MinuteInterval(DateTime.fromMillis(since))
    const endDateTime = startOf5MinuteInterval(DateTime.utc())

    const newStats = []

    for (const unitName of Object.keys(unitsStatsMap)) {
      const unitStats = unitsStatsMap[unitName]

      const fullUnitStats = fillTimeSeriesGaps(unitStats, startDateTime, endDateTime, {
        unitName,
        errors: 0,
        invocations: 0,
        averageDuration: null,
        errorRate: null,
      }, 300 * 1000)

      newStats.push(...fullUnitStats)
    }

    if (isEmpty(newStats)) {
      return
    }

    await connection.getRepository(UnitStats)
      .createQueryBuilder()
      .insert()
      .values(newStats)
      .onConflict('(unit_name, datetime) do update set invocations = EXCLUDED.invocations, errors = EXCLUDED.errors, error_rate = EXCLUDED.error_rate, average_duration = EXCLUDED.average_duration')
      .execute()
  }
}

export const unitService = new UnitService()
