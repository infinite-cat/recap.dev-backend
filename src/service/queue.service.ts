import { Rabbit } from 'rabbit-queue'
import { config } from '../config'
import { RawTrace } from '../entity/raw-trace'
import { logger } from '../utils/logger'

export class QueueService {
  protected rabbit: Rabbit

  public static readonly NEW_TRACES_QUEUE_NAME = 'new_traces'

  public getRabbit() {
    return this.rabbit
  }

  public async connect() {
    this.rabbit = new Rabbit(config.queueUrl)
    this.rabbit.on('disconnected', (err = new Error('Rabbitmq Disconnected')) => {
      console.error(err)
      setTimeout(() => this.rabbit.reconnect(), 100)
    })
    this.rabbit.on('log', (component, level, ...args) => logger[level](`RabbitMQ: [${level}] ${component}`, ...args))

    await this.rabbit.createQueue(QueueService.NEW_TRACES_QUEUE_NAME, { durable: true })
  }

  public async enqueueNewTrace(trace: RawTrace) {
    return this.rabbit.publish(QueueService.NEW_TRACES_QUEUE_NAME, trace)
  }
}

export const queueService = new QueueService()
