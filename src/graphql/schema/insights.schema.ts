import { gql } from 'apollo-server-express'

export const Insights = gql`
  type Insight {
    type: String!
    detailsLink: String!
    message: String!
  }
`
