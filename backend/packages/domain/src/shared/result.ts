/**
 * Result型
 * 例外を使わずにエラーハンドリングを行うための型
 * Rustのstd::result::Resultに相当
 */

// Result型の定義
export type Ok<T> = {
  type: 'ok'
  value: T
}

export type Err<E> = {
  type: 'err'
  error: E
}

export type Result<T, E> = Ok<T> | Err<E>

// 基本的なコンストラクタ
export const ok = <T>(value: T): Ok<T> => ({
  type: 'ok',
  value,
})

export const err = <E>(error: E): Err<E> => ({
  type: 'err',
  error,
})

// 型ガード
export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> =>
  result.type === 'ok'

export const isErr = <T, E>(result: Result<T, E>): result is Err<E> =>
  result.type === 'err'

// map関数 - 成功時の値を変換
export const map = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> => {
  if (isOk(result)) {
    return ok(fn(result.value))
  }
  return result
}

// mapErr関数 - エラー時の値を変換
export const mapErr = <T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> => {
  if (isErr(result)) {
    return err(fn(result.error))
  }
  return result
}

// chain関数（flatMap） - 成功時に別のResult型を返す関数を適用
export const chain = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> => {
  if (isOk(result)) {
    return fn(result.value)
  }
  return result
}

// flatMap関数 - chainのエイリアス
export const flatMap = chain

// chainAsync関数 - 非同期版のchain
export const chainAsync = async <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Promise<Result<U, E>>
): Promise<Result<U, E>> => {
  if (isOk(result)) {
    return fn(result.value)
  }
  return result
}

// unwrap関数 - 成功時の値を取得（エラー時は例外を投げる）
export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (isOk(result)) {
    return result.value
  }
  throw new Error('Called unwrap on an Err value')
}

// unwrapOr関数 - 成功時の値を取得（エラー時はデフォルト値を返す）
export const unwrapOr = <T, E>(result: Result<T, E>, defaultValue: T): T => {
  if (isOk(result)) {
    return result.value
  }
  return defaultValue
}

// match関数 - パターンマッチング
export const match = <T, E, R>(
  result: Result<T, E>,
  cases: {
    ok: (value: T) => R
    err: (error: E) => R
  }
): R => {
  if (isOk(result)) {
    return cases.ok(result.value)
  }
  return cases.err(result.error)
}

// fromNullable関数 - null/undefinedをResultに変換
export const fromNullable = <T, E>(
  value: T | null | undefined,
  error: E
): Result<NonNullable<T>, E> => {
  if (value !== null && value !== undefined) {
    return ok(value as NonNullable<T>)
  }
  return err(error)
}

// fromPromise関数 - PromiseをResultに変換
export const fromPromise = async <T, E = unknown>(
  promise: Promise<T>
): Promise<Result<T, E>> => {
  try {
    const value = await promise
    return ok(value)
  } catch (error) {
    return err(error as E)
  }
}

// 複数のResultを組み合わせる
export const combine = <T extends readonly Result<unknown, unknown>[]>(
  results: T
): Result<
  { [K in keyof T]: T[K] extends Result<infer U, unknown> ? U : never },
  T[number] extends Result<unknown, infer E> ? E : never
> => {
  const values: unknown[] = []

  for (const result of results) {
    if (isErr(result)) {
      return result as Result<
        { [K in keyof T]: T[K] extends Result<infer U, unknown> ? U : never },
        T[number] extends Result<unknown, infer E> ? E : never
      >
    }
    values.push(result.value)
  }

  return ok(
    values as {
      [K in keyof T]: T[K] extends Result<infer U, unknown> ? U : never
    }
  )
}

// pipe関数 - 関数合成のヘルパー
export const pipe = <T>(value: T) => ({
  chain: <U, E>(fn: (value: T) => Result<U, E>) => pipe(fn(value)),
  map: <U>(fn: (value: T) => U) => pipe(fn(value)),
  value: () => value,
})

// Result型を返す関数のためのユーティリティ型
export type ResultAsync<T, E> = Promise<Result<T, E>>

// エラーハンドリングのためのユーティリティ
export const tryCatch = <T, E>(
  fn: () => T,
  onError: (error: unknown) => E
): Result<T, E> => {
  try {
    return ok(fn())
  } catch (error) {
    return err(onError(error))
  }
}

export const tryCatchAsync = async <T, E>(
  fn: () => Promise<T>,
  onError: (error: unknown) => E
): Promise<Result<T, E>> => {
  try {
    const value = await fn()
    return ok(value)
  } catch (error) {
    return err(onError(error))
  }
}
