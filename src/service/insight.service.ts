import { map } from 'lodash'
import { getConnection } from 'typeorm'

import { InsightType } from '../entity/insight-type'

export class InsightService {
  public async getInsights(since: number) {
    const connection = getConnection()

    const highErrorRateUnits = await connection.query(`
        select unit_name as "unitName",
        cast(sum(errors) as double precision) / sum(invocations) as "errorRate"
        from unit_stats
        where datetime >= $1
        group by unit_name
        having cast(sum(errors) as double precision) / sum(invocations) > 0.01
    `, [since])

    return map(highErrorRateUnits, ({ unitName, errorRate }: any) => ({
      type: InsightType.ERROR,
      detailsLink: `/units/${unitName}`,
      message: `High error rate (${Math.round(errorRate * 100)}%) in unit ${unitName}`,
    }))
  }
}

export const insightService = new InsightService()
