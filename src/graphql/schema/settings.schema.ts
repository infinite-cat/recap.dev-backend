import { gql } from 'apollo-server-express'

export const Settings = gql`
  type Settings {
    id: Int
    isAwsIntegrationEnabled: Boolean!
    host: String!
    cleanupAfterDays: Int
    notificationConfigurations: JSON
  }

  input SettingsInput {
    id: Int
    isAwsIntegrationEnabled: Boolean!
    host: String!
    cleanupAfterDays: Int
    notificationConfigurations: JSON
  }
  
  type IntegrationTestResult {
    success: Boolean!
    error: String
  }
`
