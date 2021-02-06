import { map } from 'lodash'
import { createConnection } from 'typeorm'

import * as entities from '../../entity/pg'
import * as migrations from './migrations'
import { config } from '../../config'

export const createDbConnection = async () => {
  await createConnection({
    name: 'default',
    type: 'postgres',
    host: process.env.postgresHost || 'localhost',
    port: Number(process.env.postgresPort) || 8001,
    username: process.env.postgresUsername || 'postgres',
    password: process.env.postgresPassword || 'password',
    database: process.env.postgresDatabase || 'postgres',
    logging: false,
    // @ts-ignore
    entities: [...map(entities)],
    // @ts-ignore
    migrations: [...map(migrations)] as string[],
    maxQueryExecutionTime: 2000,
    migrationsRun: true,
    extra: {
      max: 20,
      statement_timeout: config.postgresQueryTimeout,
    },
  })
}
