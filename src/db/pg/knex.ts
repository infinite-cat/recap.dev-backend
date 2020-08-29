import createKnex from 'knex'

export const knex = createKnex({ client: 'pg', version: '8.3.2' })
