import { isEmpty, chain, filter, find, map } from 'lodash'
import { getConnection } from 'typeorm'

import { StoredTrace, ReportedError } from '../entity/pg'
import { settingsService } from './settings.service'
import { notificationChannelService } from './notification/notification-channel.service'
import { unitErrorService } from './unit-error.service'
import { logger } from '../utils/logger'

class ReportService {
  protected static readonly FIVE_MINUTES = 5 * 60 * 1000

  async reportError(traces: StoredTrace[]) {
    if (isEmpty(traces)) {
      return
    }

    const settings = await settingsService.getSettings()

    if (isEmpty(settings?.notificationConfigurations)) {
      logger.info('No notification channels configured, skipping reporting new errors')
      return
    }

    const ids = chain(traces)
      .map('unitError.id')
      .uniq()
      .value()

    const connection = getConnection()

    const alreadyReportedErrors = await connection.getRepository(ReportedError).findByIds(ids)

    const now = Date.now()

    const errorsToReport = filter(ids, (id) => {
      const reportedError = find(alreadyReportedErrors, { unitErrorId: id })

      return !reportedError || reportedError.reportedAt < (now - ReportService.FIVE_MINUTES)
    })

    if (isEmpty(errorsToReport)) {
      return
    }

    const errorReportDatas = await unitErrorService.getErrorReports(errorsToReport)

    await notificationChannelService.reportErrors(errorReportDatas, settings)

    const newlyReportedErrors = map(errorsToReport, (id) => ({
      unitErrorId: id,
      reportedAt: now,
    }))

    await connection.getRepository(ReportedError)
      .createQueryBuilder()
      .insert()
      .values(newlyReportedErrors)
      .onConflict('(unit_error_id) do update set reported_at = EXCLUDED.reported_at')
      .execute()
  }
}

export const reportService = new ReportService()
