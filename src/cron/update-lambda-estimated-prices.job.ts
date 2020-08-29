import { CronJob } from 'cron'
import { getConnection } from 'typeorm'
import { groupBy, reduce, find } from 'lodash'

import { AwsLambdaPrice, Unit } from '../entity/pg'
import { settingsService } from '../service'


export const updateAwsLambdasEstimatedCosts = new CronJob('0 0 * * * *', async () => {
  const settings = await settingsService.getSettings()

  if (!settings.isAwsIntegrationEnabled) {
    return
  }

  console.log('Updating AWS Lambdas estimated costs')

  try {
    const connection = await getConnection()

    const priceRates = await connection.getRepository(AwsLambdaPrice).find()

    const lambdaStats = await connection.query(`
        select unit_name as "unitName",
               count(*) as invocations,
               sum((coalesce((extra_data ->> 'billedDuration')::double precision, 0) / 1000) * ((extra_data ->> 'memorySize')::double precision / 1024)) as "gbSeconds",
               extra_data -> 'awsRegion' as region
        from traces
                 join units u on traces.unit_name = u.name
        where u.type = 'AWS_LAMBDA' and traces.start > extract(epoch from NOW() - INTERVAL '7 DAY') * 1000
        group by unit_name, region
    `)

    const unitsMap = groupBy(lambdaStats, 'unitName')

    for (const unitName of Object.keys(unitsMap)) {
      const last7DaysCost = reduce(unitsMap[unitName], (totalCost, currentData) => {
        const regionRate = find(priceRates, { region: currentData.region })

        if (!regionRate) {
          console.warn(`Unknown AWS region: ${currentData.region}`)
          return 0
        }

        return totalCost + currentData.invocations * regionRate.requestPrice + currentData.gbSeconds * regionRate.pricePerGbSeconds
      }, 0)

      const approximate30DaysCost = (last7DaysCost / 7) * 30

      const unit = await connection.getRepository(Unit).findOne(unitName)

      if (unit) {
        unit.estimatedCost = approximate30DaysCost

        await connection.getRepository(Unit).save(unit)
      }
    }

    console.log('Successfully updated AWS Lambdas estimated costs')
  } catch (err) {
    console.warn('Failed to update lambda prices ', err)
  }
})
