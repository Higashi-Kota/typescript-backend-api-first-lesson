import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'

import type { AllowFormatValue } from '../types'

/**
 * 日付を指定されたフォーマットの文字列に変換する
 * UTCのISO文字列が渡された場合はUTCのまま日付部分を抽出する
 * @param date 日付オブジェクトまたはISO文字列
 * @param formatString フォーマット文字列
 * @param preserveUTC UTCの日付をそのまま保持するかどうか（デフォルトtrue）
 * @returns フォーマットされた日付文字列
 */
export const formatDate = (
  date: Date | string,
  formatString: AllowFormatValue = 'yyyy-MM-dd',
  preserveUTC = true
): string => {
  // 文字列かつUTC保持モードの場合
  if (typeof date === 'string' && preserveUTC) {
    // ISO 8601形式の文字列（例: '1992-07-31T15:00:00.000Z'）の場合
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(date)) {
      const dateObj = new Date(date)
      const year = dateObj.getUTCFullYear()
      const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0')
      const day = String(dateObj.getUTCDate()).padStart(2, '0')

      // 基本的なyyyy-MM-dd形式の場合はカスタム処理
      if (formatString === 'yyyy-MM-dd') {
        return `${year}-${month}-${day}`
      }

      // その他の複雑なフォーマットはDate-fnsのUTCメソッドで処理する必要がある
      // ここでは実装を簡略化していますが、他のフォーマットも必要であれば拡張してください
    }
  }

  // 通常のケース：文字列の場合はparseISOを使用してDateオブジェクトに変換
  const dateObject = typeof date === 'string' ? parseISO(date) : date

  return format(dateObject, formatString, { locale: ja })
}
