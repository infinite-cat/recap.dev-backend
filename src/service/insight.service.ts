import { map } from 'lodash'
import { getConnection } from 'typeorm'

import { InsightType } from '../entity/insight-type'

export class InsightService {
  public async getInsights(from: number, to: number) {
    const connection = getConnection()

    const highErrorRateUnits = await connection.query(`
        select unit_name as "unitName",
        case when sum(invocations) = 0 THEN 0 ELSE cast(sum(errors) as double precision) / sum(invocations) end as "errorRate"
        from unit_stats
        where datetime >= $1 and datetime <= $2
        group by unit_name
        having case when sum(invocations) = 0 THEN 0 ELSE cast(sum(errors) as double precision) / sum(invocations) end > 0.01
    `, [from, to])

    return map(highErrorRateUnits, ({ unitName, errorRate }: any) => ({
      type: InsightType.ERROR,
      detailsLink: `/units/${unitName}`,
      message: `High error rate (${Math.round(errorRate * 100)}%) in unit ${unitName}`,
    }))
  }
}

export const insightService = new InsightService()
