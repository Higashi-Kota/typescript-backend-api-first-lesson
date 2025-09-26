import { match } from 'ts-pattern'

export type Result<T, E> =
  | { type: 'success'; data: T }
  | { type: 'error'; error: E }

export const Result = {
  success<T>(data: T): Result<T, never> {
    return { type: 'success', data }
  },

  error<E>(error: E): Result<never, E> {
    return { type: 'error', error }
  },

  isSuccess<T, E>(
    result: Result<T, E>,
  ): result is { type: 'success'; data: T } {
    return result.type === 'success'
  },

  isError<T, E>(result: Result<T, E>): result is { type: 'error'; error: E } {
    return result.type === 'error'
  },

  map<T, E, U>(result: Result<T, E>, fn: (data: T) => U): Result<U, E> {
    return match(result)
      .with({ type: 'success' }, ({ data }) => Result.success(fn(data)))
      .with({ type: 'error' }, ({ error }) => Result.error(error))
      .exhaustive()
  },

  mapError<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
    return match(result)
      .with({ type: 'success' }, ({ data }) => Result.success(data))
      .with({ type: 'error' }, ({ error }) => Result.error(fn(error)))
      .exhaustive()
  },

  flatMap<T, E, U>(
    result: Result<T, E>,
    fn: (data: T) => Result<U, E>,
  ): Result<U, E> {
    return match(result)
      .with({ type: 'success' }, ({ data }) => fn(data))
      .with({ type: 'error' }, ({ error }) => Result.error(error))
      .exhaustive()
  },

  async fromPromise<T>(promise: Promise<T>): Promise<Result<T, Error>> {
    try {
      const data = await promise
      return Result.success(data)
    } catch (error) {
      return Result.error(
        error instanceof Error ? error : new Error(String(error)),
      )
    }
  },

  unwrap<T, E>(result: Result<T, E>): T {
    return match(result)
      .with({ type: 'success' }, ({ data }) => data)
      .with({ type: 'error' }, ({ error }) => {
        throw new Error(
          `Attempted to unwrap an error result: ${JSON.stringify(error)}`,
        )
      })
      .exhaustive()
  },

  unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
    return match(result)
      .with({ type: 'success' }, ({ data }) => data)
      .with({ type: 'error' }, () => defaultValue)
      .exhaustive()
  },
}
