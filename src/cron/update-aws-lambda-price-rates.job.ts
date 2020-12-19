import { CronJob } from 'cron'
import { getConnection } from 'typeorm'
import { AwsLambdaPrice } from '../entity/pg'
import { awsPricingService } from '../service/aws/aws-pricing.service'
import { settingsService } from '../service'
import { logger } from '../utils/logger'


export const updateAwsLambdaPriceRates = new CronJob('0 0 0 * * *', async () => {
  const settings = await settingsService.getSettings()

  if (!settings.isAwsIntegrationEnabled) {
    return
  }

  logger.info('Updating AWS Lambda price rates')

  try {
    const connection = await getConnection()

    const pricingData = await awsPricingService.getLambdaPrices()

    await connection.getRepository(AwsLambdaPrice).save(pricingData)

    logger.info('Successfully updated AWS Lambda price rates')
  } catch (err) {
    logger.error('Failed to update lambda price rates ', err)
  }
})
