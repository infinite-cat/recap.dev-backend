import { awsPricingService } from './aws-pricing.service'

describe('cloudwatch-log.service.ts', () => {
  test('happy path', async () => {
    const response = await awsPricingService.getLambdaPrices()

    expect(response?.length).toBe(22)

    for (const regionData of response) {
      expect(regionData).toEqual({
        region: expect.any(String),
        pricePerGbSeconds: expect.any(String),
        requestPrice: expect.any(String),
      })
    }

    /*
      If this test fails it means that AWS added/renamed a region.
      Go to the page https://aws.amazon.com/lambda/pricing/
      and run a script to get a new regionNames consant for the AwsPricingService

      $$('.lb-dropdown-label li')
      .reduce((acc, current) => { acc[current.innerHTML] = current.dataset.region; return acc; }, {})

      Run the test again, names don't necessarily match.
     */
  })
})
