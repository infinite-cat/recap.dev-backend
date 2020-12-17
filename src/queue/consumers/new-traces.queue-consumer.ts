import { ConsumeMessage } from 'amqplib'
import { map, chain, maxBy } from 'lodash'

import { QueueService } from '../../service/queue.service'
import { QueueConsumer } from './queue-consumer'
import { RawTrace } from '../../entity/raw-trace'
import { traceService, unitService } from '../../service'
import { config } from '../../config'

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
    const traces: RawTrace[] = map(messages, (message) => JSON.parse(message.content.toString('utf-8')))

    const units = chain(traces)
      .map((trace) => ({ name: trace.unitName, type: trace.unitType }))
      .uniqBy(JSON.stringify)
      .value()

    for (const unit of units) {
      await unitService.createUnit(unit.name, unit.type)
    }

    const processedTraces = map(traces, traceService.processRawTrace)

    await traceService.saveTraces(processedTraces)

    this.channel.ack(maxBy(messages, 'fields.deliveryTag')!, true)
  }
}

export const newTracesQueueConsumer = new NewTracesQueueConsumer()
