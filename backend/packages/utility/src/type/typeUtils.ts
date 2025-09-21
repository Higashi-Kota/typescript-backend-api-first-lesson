export const isArray = (data: unknown): data is Array<unknown> =>
  Array.isArray(data)

export const isObject = (data: unknown): data is Record<string, unknown> =>
  typeof data === 'object' &&
  data !== null &&
  !Array.isArray(data) &&
  !(data instanceof Set) &&
  !(data instanceof Map)

export const isPlainObject = (data: unknown): data is Record<string, unknown> =>
  typeof data === 'object' && data !== null

export const isNullOrUndefined = (data: unknown): data is null | undefined =>
  data === null || data === undefined || data === 'null' || data === 'undefined'

export const isUndefined = (data: unknown): data is undefined =>
  data === undefined

export const isNull = (data: unknown): data is null => data === null

export const isMap = (data: unknown): data is Map<unknown, unknown> =>
  data instanceof Map

export const isSet = (data: unknown): data is Set<unknown> =>
  data instanceof Set

export const isEmptyString = (data: unknown): data is '' =>
  typeof data === 'string' && data.length === 0

export const isEmptyArray = (data: unknown): data is [] =>
  Array.isArray(data) && data.length === 0

export const isEmptyObject = (data: unknown): data is Record<string, never> =>
  isObject(data) && Object.keys(data).length === 0

export const isEmptyMap = (data: unknown): data is Map<never, never> =>
  isMap(data) && data.size === 0

export const isEmptySet = (data: unknown): data is Set<never> =>
  isSet(data) && data.size === 0

export const isNanValue = (data: unknown): data is number | 'NaN' =>
  Number.isNaN(data) || data === 'NaN'

export const isNumber = (data: unknown): data is number =>
  typeof data === 'number' && !Number.isNaN(data)

export const isMinusNumber = (data: unknown): data is number => {
  if (typeof data !== 'number') {
    return false
  }
  if (isNanValue(data)) {
    return false
  }

  return data < 0
}

export const isEmpty = (
  data: unknown
): data is '' | [] | Record<string, never> | Map<never, never> | Set<never> =>
  isEmptyString(data) ||
  isEmptyArray(data) ||
  isEmptyObject(data) ||
  isEmptyMap(data) ||
  isEmptySet(data)
