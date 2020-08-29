import { serializeError as errorToPlainObject } from 'serialize-error'

export const errorToObject = (err?: Error, includeStack: boolean = true) => {
  if (!err) {
    return undefined
  }

  const errorObject = errorToPlainObject(err)

  if (!includeStack) {
    delete errorObject.stack
  }

  return errorObject
}

export const errorToString = (err?: Error, includeStack: boolean = true) => JSON.stringify(errorToObject(err, includeStack))
