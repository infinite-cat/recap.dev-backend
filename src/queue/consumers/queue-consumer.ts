import amqp, { Channel, ConsumeMessage } from 'amqplib'
import { config } from '../../config'
import { logger } from '../../utils/logger'

export abstract class QueueConsumer {
  protected channel: Channel

  protected async init(queueName: string) {
    const connection = await amqp.connect(config.queueUrl)
    this.channel = await connection.createChannel()
    await this.channel.assertQueue(queueName, { durable: true })
    await this.channel.prefetch(config.traceProcessingBatchSize)
    await this.channel.consume(queueName, (message) => this.onMessage(message!), { noAck: false })

    connection.on('close', () => {
      logger.error('[AMQP] reconnecting')
      return setTimeout(this.init, 1000)
    })
  }

  public abstract async onMessage(message: ConsumeMessage): Promise<void>
}
