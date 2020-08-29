import { ApolloServer } from 'apollo-server-express'
import express from 'express'
import resolvers from './resolvers'
import schema from './schema'

const server = new ApolloServer({
  typeDefs: schema as any,
  resolvers,
})

const app = express()
server.applyMiddleware({ app })

export { app as analyticsApi }
