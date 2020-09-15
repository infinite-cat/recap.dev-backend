import { LogEntry } from './log-entry'

interface FunctionCallEvent {
  start: string
  end: string
  fileName?: string
  functionName: string
  status: 'OK' | 'ERROR'
  error?: Error
}

interface ResourceAccessEvent {
  start: string
  end: string
  serviceName: string
  status: 'OK' | 'ERROR'
  resourceIdentifier?: any
  request?: any
  response?: any
  error?: string
}


export interface RawTrace {
  id: string
  unitName: string
  unitType: string
  status: 'ERROR' | 'OK',
  request: any
  response: any
  start?: string
  end?: string
  error?: string
  logs?: LogEntry
  functionCallEvents: FunctionCallEvent[]
  resourceAccessEvents: ResourceAccessEvent[]
  extraData?: any
}
