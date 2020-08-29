import { WebClient } from '@slack/client'
import { ErrorReportData } from '../../entity/error-report-data'
import { SlackNotificationConfiguration } from '../../entity/pg/notification-configuration'
import { Settings } from '../../entity/pg'
import { errorToString } from '../trace/error-utils'

export class SlackService {
  protected readonly web: WebClient

  protected readonly channelId: string

  protected readonly settings: Settings

  constructor(configuration: SlackNotificationConfiguration, settings: Settings) {
    this.web = new WebClient(configuration.token)
    this.channelId = configuration.channelId
    this.settings = settings
  }

  public async reportErrors(errorReportDatas: ErrorReportData[]) {
    await Promise.all(errorReportDatas.map((errorData) => this.web.chat.postMessage({
      ts: Date.now(),
      icon_emoji: ':warning:',
      channel: this.channelId,
      text: '',
      attachments: [
        {
          color: '#FF0000',
          blocks: [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: this.generateExceptionMessage(errorData, this.settings),
            },
          }, {
            type: 'divider',
          }, {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: '*Unit Name*',
              },
              {
                type: 'mrkdwn',
                text: '*Error Type*',
              },
              {
                type: 'plain_text',
                text: errorData.unitName,
              },
              {
                type: 'plain_text',
                text: errorData.error.name,
              },
              {
                type: 'mrkdwn',
                text: '*Occurrences (Last 24 hours)*',
              },
              {
                type: 'plain_text',
                text: ' ',
              },
              {
                type: 'plain_text',
                text: errorData.last24HoursOccurrences.toString(),
              },
            ],
          }, {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `
              \`\`\`
${errorData.error.stack}
    \`\`\`\``,
            },
          }],
        },
      ],
    })))
  }

  private generateExceptionMessage(errorData: ErrorReportData, settings: Settings) {
    return `<http://${settings.host}/traces/${errorData.lastTraceId}|*${errorData.error.message}* in *${errorData.unitName}*>`
  }

  async testIntegration() {
    try {
      await this.web.chat.postMessage({
        ts: Date.now(),
        icon_emoji: ':heavy_check_mark:',
        channel: this.channelId,
        text: '',
        attachments: [
          {
            color: '#00FF00',
            blocks: [{
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: 'Yay, your recap.dev Slack integration works!',
              },
            }],
          },
        ],
      })
    } catch (error) {
      return {
        success: false,
        error: errorToString(error),
      }
    }

    return {
      success: true,
    }
  }
}
