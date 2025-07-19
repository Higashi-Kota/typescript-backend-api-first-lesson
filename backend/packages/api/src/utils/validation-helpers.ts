/**
 * Validation Helpers
 * 入力検証とサニタイゼーションのヘルパー関数
 */

import { z } from 'zod'

/**
 * 共通のバリデーションスキーマ
 */
export const commonSchemas = {
  // Email
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase()
    .trim(),

  // パスワード（12文字以上、大文字・小文字・数字・特殊文字を含む）
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),

  // 名前
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(
      /^[a-zA-Z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s'-]+$/,
      'Name contains invalid characters'
    )
    .trim(),

  // 電話番号
  phoneNumber: z
    .string()
    .regex(
      /^[+]?[(]?[0-9]{1,3}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/,
      'Invalid phone number format'
    )
    .trim(),

  // UUID
  uuid: z.string().uuid('Invalid UUID format'),

  // 日付
  date: z.string().datetime('Invalid date format'),

  // URL
  url: z.string().url('Invalid URL format').max(2048, 'URL too long'),

  // ページネーション
  pagination: z.object({
    page: z.coerce
      .number()
      .int('Page must be an integer')
      .min(1, 'Page must be at least 1')
      .default(1),
    limit: z.coerce
      .number()
      .int('Limit must be an integer')
      .min(1, 'Limit must be at least 1')
      .max(100, 'Limit must be at most 100')
      .default(20),
  }),

  // ソート
  sortOrder: z.enum(['asc', 'desc']).default('desc'),

  // 検索キーワード
  searchKeyword: z
    .string()
    .max(100, 'Search keyword too long')
    .regex(
      /^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s'-]*$/,
      'Search keyword contains invalid characters'
    )
    .trim()
    .optional(),

  // 整数
  positiveInt: z.coerce
    .number()
    .int('Must be an integer')
    .positive('Must be positive'),

  // 金額（正の数値、小数点以下2桁まで）
  money: z.coerce
    .number()
    .positive('Amount must be positive')
    .multipleOf(0.01, 'Amount must have at most 2 decimal places'),

  // Boolean
  boolean: z
    .union([z.boolean(), z.literal('true'), z.literal('false')])
    .transform((val) => val === true || val === 'true'),
}

/**
 * パスワードの強度チェック
 */
export function checkPasswordStrength(password: string): {
  score: number
  feedback: string[]
} {
  const feedback: string[] = []
  let score = 0

  // 長さチェック
  if (password.length >= 12) score += 1
  if (password.length >= 16) score += 1
  if (password.length >= 20) score += 1

  // 文字種チェック
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[@$!%*?&]/.test(password)) score += 1

  // 連続文字チェック
  if (!/(.)\1{2,}/.test(password)) score += 1
  else feedback.push('Avoid repeated characters')

  // 一般的な弱いパスワードパターン
  const weakPatterns = [
    /^(password|12345678|qwerty|abc123|letmein|welcome|monkey|dragon)/i,
    /^(\d{6,}|[a-z]{6,}|[A-Z]{6,})$/,
  ]

  if (!weakPatterns.some((pattern) => pattern.test(password))) {
    score += 1
  } else {
    feedback.push('Password is too common')
  }

  // フィードバック生成
  if (score < 3) feedback.push('Very weak password')
  else if (score < 5) feedback.push('Weak password')
  else if (score < 7) feedback.push('Fair password')
  else if (score < 9) feedback.push('Good password')
  else feedback.push('Strong password')

  return { score: Math.min(score, 10), feedback }
}

/**
 * SQLインジェクション対策のための特殊文字エスケープ
 */
export function escapeSqlWildcards(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

/**
 * ファイル名のサニタイゼーション
 */
export function sanitizeFilename(filename: string): string {
  // 危険な文字を除去
  let sanitized = filename.replace(/[<>:"/\\|?*]/g, '')

  // 制御文字を除去（0x00-0x1F）
  for (let i = 0; i < 32; i++) {
    sanitized = sanitized.replace(new RegExp(String.fromCharCode(i), 'g'), '')
  }

  return sanitized
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .trim()
    .slice(0, 255) // 最大長を制限
}

/**
 * バリデーションエラーをレスポンス用に整形
 */
export function formatValidationErrors(error: z.ZodError): {
  code: string
  message: string
  errors: Array<{
    field: string
    message: string
  }>
} {
  return {
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    errors: error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    })),
  }
}

/**
 * リクエストボディの安全な検証
 */
export function validateRequestBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown
):
  | { success: true; data: T }
  | { success: false; error: ReturnType<typeof formatValidationErrors> } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  return {
    success: false,
    error: formatValidationErrors(result.error),
  }
}
