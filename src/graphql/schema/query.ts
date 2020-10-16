import { gql } from 'apollo-server-express'

export const Query = gql`
  type Query {
    getErrors(from: String!, to: String, offset: Int): GetUnitErrorsResponse!
    getErrorStats(id: String!, from: String!, to: String): [UnitErrorDetailsGraphStats!]!
    getError(id: String!): UnitError
    getTraces(search: String, offset: Int, unitName: String, unitErrorId: String, limit: Int, statuses: [String!]): GetTracesResponse!
    getTrace(id: String!): Trace
    getUnits(from: String!, to: String, search: String, offset: Int, orderBy: String, orderDirection: String): GetUnitsResponse!
    getUnit(unitName: String!, from: String!, to: String): UnitDetails
    getInsights(from: String!, to: String): [Insight!]!
    getTotalStats(from: String!, to: String): TotalStats!
    getNewErrors(from: String!, to: String): [UnitError!]!
    getTopInvokedUnits(from: String!, to: String): [TopInvokedUnit!]!
    getSettings: Settings!
  }
`
