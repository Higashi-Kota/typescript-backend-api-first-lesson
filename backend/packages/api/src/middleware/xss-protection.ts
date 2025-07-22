/**
 * XSS Protection Middleware
 * Sum型とts-patternを使用した型安全なXSS対策の実装
 */

import type { NextFunction, Request, Response } from 'express'
import { match } from 'ts-pattern'

/**
 * サニタイズが必要なコンテンツタイプ
 */
type ContentType =
  | { type: 'json' }
  | { type: 'formUrlencoded' }
  | { type: 'multipart' }
  | { type: 'text' }
  | { type: 'other'; value: string }

/**
 * サニタイズ結果
 */
type SanitizeResult =
  | { type: 'sanitized'; value: unknown }
  | { type: 'skipped'; reason: string }
  | { type: 'error'; message: string }

/**
 * HTTPメソッドタイプ
 */
type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS'

/**
 * リクエストのContent-Typeを判定
 */
function getContentType(req: Request): ContentType {
  const contentType = req.get('content-type') ?? ''

  return match(contentType.toLowerCase())
    .when(
      (ct) => ct.includes('application/json'),
      () => ({ type: 'json' }) as const
    )
    .when(
      (ct) => ct.includes('application/x-www-form-urlencoded'),
      () => ({ type: 'formUrlencoded' }) as const
    )
    .when(
      (ct) => ct.includes('multipart/form-data'),
      () => ({ type: 'multipart' }) as const
    )
    .when(
      (ct) => ct.includes('text/'),
      () => ({ type: 'text' }) as const
    )
    .otherwise(() => ({ type: 'other', value: contentType }) as const)
}

/**
 * HTTPメソッドがボディを持つかチェック
 */
function hasBody(method: string): boolean {
  const methodWithBody: HttpMethod[] = ['POST', 'PUT', 'PATCH']
  return methodWithBody.includes(method.toUpperCase() as HttpMethod)
}

/**
 * 危険なHTMLパターン
 */
const DANGEROUS_PATTERNS = {
  scriptTag: /<script[^>]*>.*?<\/script>/gi,
  scriptTagSelfClosing: /<script[^>]*\/>/gi,
  eventHandler: /on\w+\s*=\s*["'][^"']*["']/gi,
  eventHandlerUnquoted: /on\w+\s*=\s*[^\s>]+/gi,
  javascript: /javascript\s*:/gi,
  dataUri: /data:[^,]*script[^,]*,/gi,
  vbscript: /vbscript\s*:/gi,
  iframeTag: /<iframe[^>]*>.*?<\/iframe>/gi,
  objectTag: /<object[^>]*>.*?<\/object>/gi,
  embedTag: /<embed[^>]*>/gi,
  styleTag: /<style[^>]*>.*?<\/style>/gi,
  linkTag: /<link[^>]*>/gi,
  metaRefresh: /<meta[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi,
  base64Script: /base64[^"']*script/gi,
  expressionBinding: /\{\{.*?\}\}/g,
  xmlEntity: /&lt;.*?&gt;/g,
} as const

/**
 * HTMLエンティティエスケープマップ
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
} as const

/**
 * HTMLエンティティをエスケープ
 */
function escapeHtml(str: string): string {
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] ?? char)
}

/**
 * 危険なパターンを除去
 */
function removeDangerousPatterns(str: string): string {
  let result = str

  // パターンマッチングで順次除去
  for (const pattern of Object.values(DANGEROUS_PATTERNS)) {
    result = result.replace(pattern, '')
  }

  return result
}

/**
 * 文字列をサニタイズ
 */
function sanitizeString(value: string): string {
  // 空文字列は変更しない
  if (value.length === 0) return value

  // Step 1: 危険なパターンを除去
  let sanitized = removeDangerousPatterns(value)

  // Step 2: HTMLエンティティをエスケープ
  sanitized = escapeHtml(sanitized)

  // Step 3: 制御文字を除去（改行とタブは除く）
  // biome-ignore lint/suspicious/noControlCharactersInRegex: 制御文字を意図的に除去
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // Step 4: NULL文字を除去
  sanitized = sanitized.replace(/\0/g, '')

  return sanitized
}

/**
 * 値を再帰的にサニタイズ
 */
function sanitizeValue(value: unknown): unknown {
  return match(value)
    .when(
      (v) => typeof v === 'string',
      (v) => sanitizeString(v as string)
    )
    .when(
      (v) => Array.isArray(v),
      (v) => (v as unknown[]).map(sanitizeValue)
    )
    .when(
      (v) =>
        v !== null &&
        typeof v === 'object' &&
        !(v instanceof Date) &&
        !(v instanceof RegExp),
      (v) => {
        const obj = v as Record<string, unknown>
        const sanitized: Record<string, unknown> = {}
        for (const [key, val] of Object.entries(obj)) {
          // キーもサニタイズ
          const sanitizedKey = sanitizeString(key)
          sanitized[sanitizedKey] = sanitizeValue(val)
        }
        return sanitized
      }
    )
    .otherwise((v) => v)
}

/**
 * リクエストボディをサニタイズ
 */
function sanitizeRequestBody(req: Request): SanitizeResult {
  try {
    if (!hasBody(req.method)) {
      return { type: 'skipped', reason: 'Method does not have body' }
    }

    if (!req.body) {
      return { type: 'skipped', reason: 'No body present' }
    }

    const sanitized = sanitizeValue(req.body)
    return { type: 'sanitized', value: sanitized }
  } catch (error) {
    return {
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * リクエストクエリをサニタイズ
 */
function sanitizeRequestQuery(req: Request): SanitizeResult {
  try {
    if (!req.query || Object.keys(req.query).length === 0) {
      return { type: 'skipped', reason: 'No query parameters' }
    }

    const sanitized = sanitizeValue(req.query)
    return { type: 'sanitized', value: sanitized }
  } catch (error) {
    return {
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * リクエストパラメータをサニタイズ
 */
function sanitizeRequestParams(req: Request): SanitizeResult {
  try {
    if (!req.params || Object.keys(req.params).length === 0) {
      return { type: 'skipped', reason: 'No route parameters' }
    }

    const sanitized = sanitizeValue(req.params)
    return { type: 'sanitized', value: sanitized }
  } catch (error) {
    return {
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * XSS保護設定
 */
export interface XssProtectionOptions {
  /** ボディのサニタイズを有効化 */
  sanitizeBody?: boolean
  /** クエリのサニタイズを有効化 */
  sanitizeQuery?: boolean
  /** パラメータのサニタイズを有効化 */
  sanitizeParams?: boolean
  /** 除外するパス */
  excludePaths?: string[]
  /** エラー時の処理 */
  onError?: (error: string, req: Request, res: Response) => void
}

/**
 * パスが除外対象かチェック
 */
export function isPathExcluded(path: string, excludePaths: string[]): boolean {
  return excludePaths.some((excludePath) => {
    if (excludePath.endsWith('*')) {
      const prefix = excludePath.slice(0, -1)
      return path.startsWith(prefix)
    }
    return path === excludePath
  })
}

/**
 * XSS保護ミドルウェア
 */
export function xssProtection(
  options: XssProtectionOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const {
    sanitizeBody = true,
    sanitizeQuery = true,
    sanitizeParams = true,
    excludePaths = [],
    onError = (error: string) =>
      console.error(`XSS Protection Error: ${error}`),
  } = options

  return (req: Request, res: Response, next: NextFunction): void => {
    // 除外パスのチェック
    if (excludePaths.length > 0 && isPathExcluded(req.path, excludePaths)) {
      next()
      return
    }

    // ボディのサニタイズ
    if (sanitizeBody && req.body) {
      const result = sanitizeRequestBody(req)
      match(result)
        .with({ type: 'sanitized' }, (r) => {
          req.body = r.value
        })
        .with({ type: 'error' }, (r) => onError(r.message, req, res))
        .otherwise(() => {})
    }

    // クエリのサニタイズ
    if (sanitizeQuery && req.query) {
      const result = sanitizeRequestQuery(req)
      match(result)
        .with({ type: 'sanitized' }, (r) => {
          req.query = r.value as unknown as typeof req.query
        })
        .with({ type: 'error' }, (r) => onError(r.message, req, res))
        .otherwise(() => {})
    }

    // パラメータのサニタイズ
    if (sanitizeParams && req.params) {
      const result = sanitizeRequestParams(req)
      match(result)
        .with({ type: 'sanitized' }, (r) => {
          req.params = r.value as unknown as typeof req.params
        })
        .with({ type: 'error' }, (r) => onError(r.message, req, res))
        .otherwise(() => {})
    }

    next()
  }
}

// エクスポート（テスト用）
export {
  sanitizeString,
  sanitizeValue,
  escapeHtml,
  removeDangerousPatterns,
  getContentType,
  hasBody,
  sanitizeRequestBody,
  sanitizeRequestQuery,
  sanitizeRequestParams,
}
