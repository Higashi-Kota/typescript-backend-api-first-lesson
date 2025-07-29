/**
 * Security Helper Functions
 * SQLインジェクション対策のためのヘルパー関数
 */

import { sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import type { AnyColumn } from 'drizzle-orm'

/**
 * LIKE検索用の安全なパターン作成
 * @param pattern 検索パターン
 * @returns エスケープされたパターン
 */
export function escapeLikePattern(pattern: string): string {
  // LIKE句で特殊な意味を持つ文字をエスケープ
  return pattern
    .replace(/\\/g, '\\\\') // バックスラッシュをエスケープ
    .replace(/%/g, '\\%') // パーセント記号をエスケープ
    .replace(/_/g, '\\_') // アンダースコアをエスケープ
}

/**
 * 安全なLIKE検索SQLフラグメントを生成
 * @param column カラム参照
 * @param pattern 検索パターン
 * @returns 安全なSQLフラグメント
 */
export function safeLike(column: AnyColumn, pattern: string): SQL {
  // パターンに%が含まれている場合は、ユーザーが意図的にワイルドカードを使っているとみなす
  if (pattern.includes('%') || pattern.includes('_')) {
    // 危険な文字（バックスラッシュ）のみエスケープ
    const safePattern = pattern.replace(/\\/g, '\\\\')
    return sql`${column} LIKE ${safePattern}`
  }

  // %や_が含まれていない場合は、前後に%を追加して部分一致検索
  const escapedPattern = escapeLikePattern(pattern)
  return sql`${column} LIKE ${`%${escapedPattern}%`}`
}

/**
 * 安全な大文字小文字を区別しないLIKE検索
 * @param column カラム参照
 * @param pattern 検索パターン
 * @returns 安全なSQLフラグメント
 */
export function safeILike(column: AnyColumn, pattern: string): SQL {
  const escapedPattern = escapeLikePattern(pattern)
  return sql`${column} ILIKE ${`%${escapedPattern}%`}`
}

/**
 * 安全な数値比較
 * @param column カラム参照
 * @param value 比較値
 * @param operator 演算子
 * @returns 安全なSQLフラグメント
 */
export function safeNumericComparison(
  column: AnyColumn,
  value: number,
  operator: '>=' | '<=' | '>' | '<' | '='
): SQL {
  // 数値の妥当性チェック
  if (!Number.isFinite(value)) {
    throw new Error('Invalid numeric value')
  }

  return sql`${column} ${sql.raw(operator)} ${value}`
}

/**
 * 安全な配列の重なりチェック（PostgreSQL）
 * @param column カラム参照
 * @param values 配列値
 * @returns 安全なSQLフラグメント
 */
export function safeArrayOverlap(column: AnyColumn, values: string[]): SQL {
  // 配列の各要素をサニタイズ
  const sanitizedValues = values.map((v) => {
    if (typeof v !== 'string') {
      throw new Error('Array values must be strings')
    }
    return v
  })

  return sql`${column} && ${sanitizedValues}`
}

/**
 * 安全なJSON属性アクセス
 * @param column カラム参照
 * @param path JSON パス
 * @param value 比較値
 * @returns 安全なSQLフラグメント
 */
export function safeJsonbAccess(
  column: AnyColumn,
  path: string,
  value: string
): SQL {
  // JSONパスの妥当性チェック
  if (!/^[a-zA-Z0-9_]+$/.test(path)) {
    throw new Error('Invalid JSON path')
  }

  return sql`${column}->>${path} = ${value}`
}

/**
 * 安全なNOT EQUAL比較
 * @param column カラム参照
 * @param value 比較値
 * @returns 安全なSQLフラグメント
 */
export function safeNotEqual(column: AnyColumn, value: string | number): SQL {
  return sql`${column} != ${value}`
}

/**
 * 安全なJSONB配列の包含チェック
 * @param column カラム参照
 * @param values 配列値
 * @returns 安全なSQLフラグメント
 */
export function safeJsonbContains(column: AnyColumn, values: unknown[]): SQL {
  // 配列の各要素を検証
  if (!Array.isArray(values)) {
    throw new Error('Values must be an array')
  }

  // JSON.stringifyは自動的にエスケープを行う
  const jsonString = JSON.stringify(values)

  return sql`${column} @> ${jsonString}::jsonb`
}
