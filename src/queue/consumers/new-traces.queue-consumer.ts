import { ConsumeMessage } from 'amqplib'
import { map, chain, maxBy, partition } from 'lodash'

import { QueueService } from '../../service/queue.service'
import { QueueConsumer } from './queue-consumer'
import { RawTrace } from '../../entity/raw-trace'
import { traceService, unitErrorService, unitService } from '../../service'
import { config } from '../../config'
import { reportService } from '../../service/report.service'

export class NewTracesQueueConsumer extends QueueConsumer {
  protected bufferedMessages: ConsumeMessage[] = []

  protected bufferedMessagesLimit = config.traceProcessingBatchSize

  protected timeout?: NodeJS.Timeout

  public async start() {
    await this.init(QueueService.NEW_TRACES_QUEUE_NAME)
  }

  public async onMessage(message: ConsumeMessage) {
    this.bufferedMessages.push(message)

    if (this.bufferedMessages.length >= this.bufferedMessagesLimit) {
      const messagesToProcess = this.bufferedMessages
      this.bufferedMessages = []
      this.processMessages(messagesToProcess)

      if (this.timeout) {
        clearTimeout(this.timeout)
      }
      this.timeout = undefined
    }

    if (!this.timeout) {
      this.timeout = setTimeout(() => {
        const messagesToProcess = this.bufferedMessages
        this.bufferedMessages = []
        this.processMessages(messagesToProcess)
        this.timeout = undefined
      }, 5000)
    }
  }

  protected async processMessages(messages: ConsumeMessage[]) {
    try {
      const traces: RawTrace[] = map(messages, (message) => JSON.parse(message.content.toString('utf-8')))

      const units = chain(traces)
        .map((trace) => ({ name: trace.unitName, type: trace.unitType }))
        .uniqBy(JSON.stringify)
        .value()

      for (const unit of units) {
        await unitService.createUnit(unit.name, unit.type)
      }

      const processedTraces = chain(traces).map(traceService.processRawTrace).compact().value()

      const [errorTraces, noErrorTraces] = partition(processedTraces, 'error')

      await unitErrorService.analyzeTraces(errorTraces)

      await traceService.saveTraces(noErrorTraces)

      await reportService.reportError(errorTraces)

      this.channel.ack(maxBy(messages, 'fields.deliveryTag')!, true)
    } catch (e) {
      console.error(e)
    }
  }
}

export const newTracesQueueConsumer = new NewTracesQueueConsumer()
