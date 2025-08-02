import { z } from 'zod'

import type { JsonValue } from 'type-fest'

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

const LiteralSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])
type Literal = z.infer<typeof LiteralSchema>
export type JSON = Literal | { [key: string]: JSON } | JSON[]
export const JsonSchema: z.ZodType<JSON> = z.lazy(() =>
  z.union([
    LiteralSchema,
    z.array(JsonSchema),
    z.record(z.string(), JsonSchema),
  ])
)

/**
 * Checks if a value is valid JSON data.
 * This function ensures that the data can be safely serialized to JSON.
 * @see https://github.com/colinhacks/zod#json-type
 */
export const isJSONData = (data: unknown): data is JsonValue => {
  // Early return for primitive JSON values
  if (data === null) {
    return true
  }
  if (
    typeof data === 'string' ||
    typeof data === 'number' ||
    typeof data === 'boolean'
  ) {
    return true
  }
  if (typeof data !== 'object') {
    return false
  }

  // Check special case of non-json objects
  if (data instanceof Date) {
    return false
  }
  if (data instanceof RegExp) {
    return false
  }
  if (data instanceof Map) {
    return false
  }
  if (data instanceof Set) {
    return false
  }
  if (data instanceof Promise) {
    return false
  }
  // biome-ignore lint/suspicious/noExplicitAny: necessary for runtime type checking
  if (typeof (data as any).then === 'function') {
    return false
  }
  if (
    // biome-ignore lint/suspicious/noExplicitAny: necessary for runtime type checking
    typeof (data as any).toJSON === 'function' &&
    data.constructor !== Object &&
    data.constructor !== Array
  ) {
    return false
  }

  // If it's a function or non-standard object, it's not JSON serializable
  if (
    typeof data === 'function' ||
    (Object.prototype.toString.call(data) !== '[object Object]' &&
      !Array.isArray(data))
  ) {
    return false
  }

  try {
    // Final validation through Zod schema
    return JsonSchema.safeParse(data).success
  } catch (_error) {
    return false
  }
}
