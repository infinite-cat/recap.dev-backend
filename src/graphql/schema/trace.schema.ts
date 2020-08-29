import { gql } from 'apollo-server-express'

export const Trace = gql`    
    type FunctionCall {
        start: String!
        end: String
        functionName: String!
        fileName: String!
    }
    
    type ResourceAccessEvent {
        start: String!
        end: String
        serviceName: String!
        resourceIdentifier: String
        request: String!
        response: String!
        status: String
        error: String
    }
    
    type GetTracesResponse {
        traces: [Trace!]!
        offset: Int!
        hasMore: Boolean!
    }
    
    type Trace {
        unitName: String!
        id: Int!
        externalId: String!
        status: String!
        request: String!
        response: String
        error: String
        functionCallEvents: [FunctionCall!]!
        resourceAccessEvents: [ResourceAccessEvent!]!
        extraData: String
        logs: String
        duration: Int!
        start: String!
        end: String!
    }
    
    type TotalGraphStats {
        invocations: String!
        errors: String!
        dateTime: String!
    }
    
    type TotalStats {
        invocations: String!
        errors: String!
        errorRate: Float
        graphStats: [TotalGraphStats!]!
    }
`
