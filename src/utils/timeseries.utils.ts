import { DateTime, Interval, Duration } from 'luxon'
import { map, xor, orderBy } from 'lodash'

const defaultDataPoint = {
  value: 0,
}

export const startOf5MinuteInterval = (dateTime: DateTime) => (
  DateTime.fromMillis(Math.floor(dateTime.startOf('minute').toMillis() / (300 * 1000)) * 300 * 1000)
)

export const fillTimeSeriesGaps = (dataPoints: any[], startDate: DateTime, endDate: DateTime, emptyDataPoint: any = defaultDataPoint, intervalMillis = 3600 * 1000) => {
  const expectedDates = [
    startDate.toMillis(),
    ...map(
      Interval
        .fromDateTimes(startDate, endDate)
        .splitBy(Duration.fromMillis(intervalMillis)),
      (interval) => interval.end.toMillis(),
    ),
  ]

  const existingDates = map(dataPoints, 'dateTime')

  const datesToFillIn = xor(expectedDates, existingDates)

  const dataPointsToAdd = map(datesToFillIn, (dateTime) => ({ ...emptyDataPoint, dateTime }))

  const completeDataPoints = [...dataPoints, ...dataPointsToAdd]

  return orderBy(completeDataPoints, ['dateTime'], ['desc'])
}
