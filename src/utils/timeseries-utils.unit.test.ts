import { DateTime } from 'luxon'

import { startOf5MinuteInterval } from './timeseries.utils'

describe('timeseries.utils', () => {
  it.each`
      dateTime                       | expectedStart
      ${'2020-08-01T09:01:32+0000'}  | ${'2020-08-01T09:00:00.000'}
      ${'2020-08-01T09:07:32+0000'}  | ${'2020-08-01T09:05:00.000'}
      ${'2020-08-01T08:57:32+0000'}  | ${'2020-08-01T08:55:00.000'}
    `('%s should be converted to %s', ({ dateTime, expectedStart }) => {
  const actual = startOf5MinuteInterval(DateTime.fromISO(dateTime))
  expect(actual.toUTC().toISO({ includeOffset: false })).toBe(expectedStart)
})
})
