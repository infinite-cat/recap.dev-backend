import { map } from 'lodash'
import { createConnection } from 'typeorm'

import * as entities from '../../entity/pg'
import * as migrations from './migrations'

export const createDbConnection = async () => {
  await createConnection({
    name: 'default',
    type: 'postgres',
    host: process.env.postgresHost || 'localhost',
    port: Number(process.env.postgresPort) || 5432,
    username: process.env.postgresUsername || 'postgres',
    password: process.env.postgresPassword || 'password',
    database: process.env.postgresDatabase || 'postgres',
    logging: Boolean(process.env.dbQueryLogging),
    // @ts-ignore
    entities: [...map(entities)],
    // @ts-ignore
    migrations: [...map(migrations)] as string[],
    migrationsRun: true,
    extra: {
      max: 20,
    },
  })
}
