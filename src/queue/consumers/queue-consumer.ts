import amqp, { Channel, ConsumeMessage } from 'amqplib'
import { config } from '../../config'

export abstract class QueueConsumer {
  protected channel: Channel

  protected async init(queueName: string) {
    const connection = await amqp.connect(config.queueUrl)
    this.channel = await connection.createChannel()
    await this.channel.assertQueue(queueName, { durable: true })
    await this.channel.prefetch(1000)
    await this.channel.consume(queueName, (message) => this.onMessage(message!), { noAck: false })
  }

  public abstract async onMessage(message: ConsumeMessage): Promise<void>
}
