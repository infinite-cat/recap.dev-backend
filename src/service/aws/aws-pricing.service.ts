import { Pricing } from 'aws-sdk'
import { filter, find, findKey, includes, keys } from 'lodash'

export class AwsPricingService {
  private readonly regionNames = {
    'US East (N. Virginia)': 'us-east-1',
    'US East (Ohio)': 'us-east-2',
    'US West (N. California)': 'us-west-1',
    'US West (Oregon)': 'us-west-2',
    'Africa (Cape Town)': 'af-south-1',
    'Asia Pacific (Hong Kong)': 'ap-east-1',
    'Asia Pacific (Mumbai)': 'ap-south-1',
    'Asia Pacific (Seoul)': 'ap-northeast-2',
    'Asia Pacific (Singapore)': 'ap-southeast-1',
    'Asia Pacific (Sydney)': 'ap-southeast-2',
    'Asia Pacific (Tokyo)': 'ap-northeast-1',
    'Canada (Central)': 'ca-central-1',
    'EU (Frankfurt)': 'eu-central-1',
    'EU (Ireland)': 'eu-west-1',
    'EU (London)': 'eu-west-2',
    'EU (Paris)': 'eu-west-3',
    'EU (Milan)': 'eu-south-1',
    'EU (Stockholm)': 'eu-north-1',
    'Europe (Stockholm)': 'eu-north-1',
    'Middle East (Bahrain)': 'me-south-1',
    'South America (Sao Paulo)': 'sa-east-1',
    'AWS GovCloud (US-East)': 'us-gov-east-1',
    'AWS GovCloud (US-West)': 'us-gov-west-1',
  }

  protected async getPricingData(pricing: Pricing, serviceCode: string, filterDefinition: any) {
    const mappedFilters: any = keys(filterDefinition).map((key) => ({
      Type: 'TERM_MATCH',
      Field: key,
      Value: filterDefinition[key],
    }))

    const durationProductsResponse = await pricing.getProducts({
      ServiceCode: serviceCode,
      Filters: mappedFilters,
    }).promise()

    const ignoredLocations = ['Asia Pacific (Osaka-Local)', 'China (Ningxia)', 'China (Beijing)', 'Any']

    const products = filter(durationProductsResponse.PriceList, (productData) => !includes(ignoredLocations, (productData as any).product.attributes.location))

    return products.map((productData: any) => {
      const termsKey = findKey(productData.terms.OnDemand)!
      const priceDimensions = productData.terms.OnDemand[termsKey].priceDimensions
      const priceDimension = find(priceDimensions, (dimension) => {
        const pricePerUnit = dimension.pricePerUnit.USD
        return pricePerUnit && pricePerUnit !== '0.0000000000'
      })

      const region = this.regionNames[productData.product.attributes.location]

      if (!region) {
        throw new Error(`Unknown region ${productData.product.attributes.location}. This usually means that AWS added/renamed a region.`)
      }

      return {
        region,
        pricePerUnit: priceDimension.pricePerUnit.USD,
      }
    })
  }

  public async getLambdaPrices() {
    const pricing = new Pricing({ region: 'us-east-1' })

    const lambdaGbPerSecondData = await this.getPricingData(pricing, 'AWSLambda', { group: 'AWS-Lambda-Duration' })
    const lambdaRequestsData = await this.getPricingData(pricing, 'AWSLambda', { group: 'AWS-Lambda-Requests' })

    return lambdaGbPerSecondData.map((data) => ({
      region: data.region,
      pricePerGbSeconds: data.pricePerUnit,
      requestPrice: find(lambdaRequestsData, { region: data.region })!.pricePerUnit,
    }))
  }
}

export const awsPricingService = new AwsPricingService()
