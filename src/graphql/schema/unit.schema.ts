import { gql } from 'apollo-server-express'

export const Unit = gql`
  type UnitListDetails {
    unitName: String!
    invocations: String!
    errors: String!
    errorRate: Float
    averageDuration: Float
    estimatedCost: Float
  }

  type GetUnitsResponse {
    units: [UnitListDetails!]!
    offset: Int!
    hasMore: Boolean!
  }

  type UnitDetailsGraphStats {
    invocations: String!
    errors: String!
    averageDuration: Float
    dateTime: String!
  }
  
  type UnitDetails {
    unitName: String!
    estimatedCost: Float
    errorRate: Float
    graphStats: [UnitDetailsGraphStats!]!
  }
  
  type TopInvokedUnit {
    unitName: String!
    estimatedCost: Float
    invocations: String!
    errors: String!
  }
`
