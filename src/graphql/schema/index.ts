import { Query } from './query'
import { Mutation } from './mutation.schema'
import { Trace } from './trace.schema'
import { UnitError } from './unit-error.schema'
import { Unit } from './unit.schema'
import { Insights } from './insights.schema'
import { Settings } from './settings.schema'

export default [
  'scalar JSON',
  Query,
  Mutation,
  Trace,
  UnitError,
  Unit,
  Insights,
  Settings,
]
