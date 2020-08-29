import { gql } from 'apollo-server-express'

export const UnitError = gql`
  type UnitErrorGraphStats {
    value: Int!
    dateTime: String!
  }
  
  type UnitErrorListitem {
    id: Int!
    unitName: String!
    type: String!
    message: String
    lastEventDateTime: String!
    graphStats: [UnitErrorGraphStats!]!
  }

  type GetUnitErrorsResponse {
    errors: [UnitErrorListitem!]!
    offset: Int!
    hasMore: Boolean!
  }

  type UnitErrorDetailsGraphStats {
    invocations: Int!
    errors: Int!
    currentErrors: Int!
    dateTime: String!
  }
  
  type UnitError {
    id: Int!
    unitName: String!
    type: String!
    message: String
    rawError: String!
    firstEventDateTime: String!
    lastEventDateTime: String!
  }
`
// add graph data here
