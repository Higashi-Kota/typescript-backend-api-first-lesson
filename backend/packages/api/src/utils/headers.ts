/**
 * Type-safe HTTP header utilities
 * Express.jsのヘッダー値の型安全な取得をサポート
 */

import type { IncomingHttpHeaders } from 'node:http'

/**
 * ヘッダー名の型定義
 * 標準的なHTTPヘッダーとカスタムヘッダーを含む
 */
export type StandardHeaders =
  | 'accept'
  | 'accept-encoding'
  | 'accept-language'
  | 'authorization'
  | 'cache-control'
  | 'content-type'
  | 'content-length'
  | 'cookie'
  | 'host'
  | 'origin'
  | 'referer'
  | 'user-agent'

export type CustomHeaders =
  | 'x-request-id'
  | 'x-api-key'
  | 'x-forwarded-for'
  | 'x-forwarded-proto'
  | 'x-real-ip'
  | 'x-csrf-token'
  | 'cf-visitor'

export type HeaderName = StandardHeaders | CustomHeaders

/**
 * ヘッダー値の型マッピング
 * 各ヘッダーに対して期待される値の型を定義
 */
export interface HeaderValueMap {
  accept: string
  'accept-encoding': string
  'accept-language': string
  authorization: string
  'cache-control': string
  'content-type': string
  'content-length': string
  cookie: string
  host: string
  origin: string
  referer: string
  'user-agent': string
  'x-request-id': string
  'x-api-key': string
  'x-forwarded-for': string
  'x-forwarded-proto': string
  'x-real-ip': string
  'x-csrf-token': string
  'cf-visitor': string
}

/**
 * ヘッダー値を型安全に取得するユーティリティクラス
 */
export class HeaderParser {
  constructor(private readonly headers: IncomingHttpHeaders) {}

  /**
   * 指定されたヘッダーの値を型安全に取得
   * @param name ヘッダー名
   * @returns ヘッダー値（存在しない場合はundefined）
   */
  get<T extends HeaderName>(name: T): HeaderValueMap[T] | undefined {
    const value = this.headers[name]

    if (value === undefined) {
      return undefined
    }

    // 配列の場合は最初の値を返す
    if (Array.isArray(value)) {
      return value[0] as HeaderValueMap[T] | undefined
    }

    // 文字列の場合はそのまま返す
    return value as HeaderValueMap[T]
  }

  /**
   * 指定されたヘッダーの値を型安全に取得（デフォルト値付き）
   * @param name ヘッダー名
   * @param defaultValue デフォルト値
   * @returns ヘッダー値（存在しない場合はデフォルト値）
   */
  getWithDefault<T extends HeaderName>(
    name: T,
    defaultValue: HeaderValueMap[T]
  ): HeaderValueMap[T] {
    return this.get(name) ?? defaultValue
  }

  /**
   * 複数のヘッダーを一度に取得
   * @param names ヘッダー名の配列
   * @returns ヘッダー名と値のマップ
   */
  getMultiple<T extends HeaderName>(
    names: readonly T[]
  ): Partial<Pick<HeaderValueMap, T>> {
    const result: Partial<Pick<HeaderValueMap, T>> = {}

    for (const name of names) {
      const value = this.get(name)
      if (value !== undefined) {
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        ;(result as any)[name] = value
      }
    }

    return result
  }

  /**
   * ヘッダーが存在するかチェック
   * @param name ヘッダー名
   * @returns 存在する場合はtrue
   */
  has<T extends HeaderName>(name: T): boolean {
    return this.headers[name] !== undefined
  }
}

/**
 * Express.jsのリクエストヘッダーから型安全なパーサーを作成
 * @param headers リクエストヘッダー
 * @returns HeaderParserインスタンス
 */
export function createHeaderParser(headers: IncomingHttpHeaders): HeaderParser {
  return new HeaderParser(headers)
}
