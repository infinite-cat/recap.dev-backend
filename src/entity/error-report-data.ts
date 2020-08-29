export interface ErrorReportData {
  error: Error
  unitName: string
  lastTraceId: string
  last24HoursOccurrences: number
}
