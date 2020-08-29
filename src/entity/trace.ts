export interface FunctionCall {
  start: string
  end?: string
  functionName?: string
  fileName?: string
}

export interface ResourceAccessEvent {
  start: string
  end?: string
  serviceName: string
  resourceIdentifier: string
  request: string
  response: string
  status: 'OK' | 'ERROR'
  error?: string
}

export interface Trace {
  unitName: string
  id: number
  externalId: string
  status: 'ERROR' | 'OK',
  request?: any
  response?: any
  error?: string
  extraData?: string
  functionCallEvents?: FunctionCall[]
  resourceAccessEvents?: ResourceAccessEvent[]
  duration: number
  start: string
  end?: string
}
