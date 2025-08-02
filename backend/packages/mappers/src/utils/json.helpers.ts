/**
 * JSON Helper Functions
 * JSON変換のユーティリティ関数
 */

/**
 * 安全にJSONをパースする
 * パースに失敗した場合はundefinedを返す
 */
export const safeJsonParse = <T = unknown>(
  jsonString: string | null | undefined
): T | undefined => {
  if (!jsonString) {
    return undefined
  }

  try {
    return JSON.parse(jsonString) as T
  } catch {
    return undefined
  }
}

/**
 * 安全にJSONをstringifyする
 * stringifyに失敗した場合はnullを返す
 */
export const safeJsonStringify = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null
  }

  try {
    return JSON.stringify(value)
  } catch {
    return null
  }
}

/**
 * オブジェクトをJSONB用に準備する
 * undefinedの値を削除し、空のオブジェクトはnullに変換
 */
export const prepareJsonb = <T extends Record<string, unknown>>(
  obj: T | undefined | null
): T | null => {
  if (!obj) {
    return null
  }

  // undefinedの値を削除
  const cleaned = Object.entries(obj).reduce(
    (acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value
      }
      return acc
    },
    {} as Record<string, unknown>
  )

  // 空のオブジェクトはnullに変換
  return Object.keys(cleaned).length > 0 ? (cleaned as T) : null
}
