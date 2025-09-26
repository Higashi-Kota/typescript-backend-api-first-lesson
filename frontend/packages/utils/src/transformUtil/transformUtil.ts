import { isArray, isNullOrUndefined } from '../typeUtil'

export const transformArray = <T>(
  value: T | Array<NonNullable<T>> | null | undefined,
): Array<NonNullable<T>> => {
  if (isNullOrUndefined(value)) {
    return [] as Array<NonNullable<T>>
  }
  if (isArray(value)) {
    return value as Array<NonNullable<T>>
  }

  return [value as NonNullable<T>]
}
