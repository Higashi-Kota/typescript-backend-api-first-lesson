/**
 * Date Helper Functions
 * 日付変換のユーティリティ関数
 */

import { format, parseISO } from 'date-fns'

/**
 * DateオブジェクトをISO文字列に変換
 */
export const toISOString = (date: Date): string => {
  return date.toISOString()
}

/**
 * DateオブジェクトをYYYY-MM-DD形式の文字列に変換
 */
export const toDateString = (date: Date): string => {
  return format(date, 'yyyy-MM-dd')
}

/**
 * ISO文字列からDateオブジェクトに変換
 */
export const fromISOString = (isoString: string): Date => {
  return parseISO(isoString)
}

/**
 * YYYY-MM-DD形式の文字列からDateオブジェクトに変換
 */
export const fromDateString = (dateString: string): Date => {
  return parseISO(dateString)
}

/**
 * null許容の日付変換
 */
export const toNullableDateString = (
  date: Date | null | undefined
): string | null => {
  return date ? toDateString(date) : null
}

/**
 * null許容の日付パース
 */
export const fromNullableDateString = (
  dateString: string | null | undefined
): Date | null => {
  return dateString ? fromDateString(dateString) : null
}
