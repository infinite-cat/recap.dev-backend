import { gql } from 'apollo-server-express'

export const Mutation = gql`
  type Mutation {
    setSettings(settings: SettingsInput!): Settings!
    testAwsIntegration: IntegrationTestResult!
    testSlackIntegration(token: String!, channelId: String!): IntegrationTestResult!
  }
`
