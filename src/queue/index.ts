import { map } from 'lodash'
import * as consumers from './consumers'

export const startConsumers = async () => {
  await Promise.all(map(consumers, (consumer) => consumer.start()))
}
