import { gql } from 'apollo-server-express'

export const Query = gql`
  type Query {
    getErrors(graphSince: String!, offset: Int): GetUnitErrorsResponse!
    getErrorStats(id: String!, since: String!): [UnitErrorDetailsGraphStats!]!
    getError(id: String!): UnitError
    getTraces(search: String, offset: Int, unitName: String, unitErrorId: String, limit: Int, status: String): GetTracesResponse!
    getTrace(id: String!): Trace
    getUnits(since: String!, search: String, offset: Int, orderBy: String, orderDirection: String): GetUnitsResponse!
    getUnit(unitName: String!, graphSince: String!): UnitDetails
    getInsights(since: String!): [Insight!]!
    getTotalStats(since: String!): TotalStats!
    getNewErrors(since: String!): [UnitError!]!
    getTopInvokedUnits(since: String!): [TopInvokedUnit!]!
    getSettings: Settings!
  }
`
