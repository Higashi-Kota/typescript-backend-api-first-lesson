/**
 * CSRF Protection Middleware
 * Sum型とts-patternを使用した型安全なCSRF対策の実装
 */

import { randomBytes } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { match } from 'ts-pattern'
import { createHeaderParser } from '../utils/headers.js'

/**
 * CSRFトークン検証結果
 */
type TokenValidationResult =
  | { type: 'valid' }
  | { type: 'invalid'; reason: string }
  | { type: 'missing' }
  | { type: 'error'; message: string }

/**
 * セッションの型拡張
 */
declare module 'express-session' {
  interface SessionData {
    _csrf?: string
  }
}

/**
 * CSRFトークンを生成
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * セッションにCSRFトークンを保存
 */
export function saveCsrfTokenToSession(req: Request, token: string): void {
  if (req.session) {
    req.session._csrf = token
  }
}

/**
 * セッションからCSRFトークンを取得
 */
export function getCsrfTokenFromSession(req: Request): string | undefined {
  return req.session?._csrf
}

/**
 * リクエストからCSRFトークンを取得
 */
export function getCsrfTokenFromRequest(req: Request): string | undefined {
  // 優先順位: Header > Body > Query
  const headerParser = createHeaderParser(req.headers)
  const headerToken = headerParser.get('x-csrf-token')
  if (headerToken) return headerToken

  // bodyとqueryの値は文字列であることを厳密にチェック
  const bodyToken = req.body?._csrf
  if (typeof bodyToken === 'string') return bodyToken

  const queryToken = req.query?._csrf
  if (typeof queryToken === 'string') return queryToken

  return undefined
}

/**
 * HTTPメソッドが保護対象かチェック
 */
const PROTECTED_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'] as const

export function isMethodRequiresProtection(method: string): boolean {
  return (PROTECTED_METHODS as readonly string[]).includes(method.toUpperCase())
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
 * CSRFトークンを検証
 */
function validateCsrfToken(
  sessionToken: string | undefined,
  requestToken: string | undefined
): TokenValidationResult {
  if (!sessionToken) {
    return { type: 'error', message: 'No CSRF token in session' }
  }

  if (!requestToken) {
    return { type: 'missing' }
  }

  if (sessionToken !== requestToken) {
    return { type: 'invalid', reason: 'Token mismatch' }
  }

  return { type: 'valid' }
}

/**
 * CSRF保護設定
 */
export interface CsrfProtectionOptions {
  /** 除外するパス */
  excludePaths?: string[]
  /** セッションが必須かどうか */
  sessionRequired?: boolean
  /** エラー時のレスポンスカスタマイズ */
  onError?: (error: string, req: Request, res: Response) => void
}

/**
 * CSRF保護ミドルウェア
 */
export function csrfProtection(
  options: CsrfProtectionOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const { excludePaths = [], sessionRequired = true, onError } = options

  return (req: Request, res: Response, next: NextFunction): void => {
    // セッションチェック
    if (sessionRequired && !req.session) {
      const errorResponse = {
        code: 'SESSION_REQUIRED',
        message: 'Session is required for CSRF protection',
      }

      if (onError) {
        onError(errorResponse.message, req, res)
      } else {
        res.status(403).json(errorResponse)
      }
      return
    }

    // 除外パスのチェック
    if (excludePaths.length > 0 && isPathExcluded(req.path, excludePaths)) {
      next()
      return
    }

    // 安全なメソッドの処理
    if (!isMethodRequiresProtection(req.method)) {
      // GETリクエストなどでトークンを生成・設定
      if (req.session) {
        let token = getCsrfTokenFromSession(req)
        if (!token) {
          token = generateCsrfToken()
          saveCsrfTokenToSession(req, token)
        }

        // レスポンスヘッダーにトークンを設定
        res.setHeader('X-CSRF-Token', token)
      }

      next()
      return
    }

    // 保護対象メソッドの検証
    const sessionToken = getCsrfTokenFromSession(req)
    const requestToken = getCsrfTokenFromRequest(req)
    const validationResult = validateCsrfToken(sessionToken, requestToken)

    match(validationResult)
      .with({ type: 'valid' }, () => next())
      .with({ type: 'missing' }, () => {
        const errorResponse = {
          code: 'INVALID_CSRF_TOKEN',
          message: 'Invalid or missing CSRF token',
        }

        if (onError) {
          onError(errorResponse.message, req, res)
        } else {
          res.status(403).json(errorResponse)
        }
      })
      .with({ type: 'invalid' }, (_r) => {
        const errorResponse = {
          code: 'INVALID_CSRF_TOKEN',
          message: 'Invalid or missing CSRF token',
        }

        if (onError) {
          onError(errorResponse.message, req, res)
        } else {
          res.status(403).json(errorResponse)
        }
      })
      .with({ type: 'error' }, (r) => {
        const errorResponse = {
          code: 'CSRF_ERROR',
          message: r.message,
        }

        if (onError) {
          onError(r.message, req, res)
        } else {
          res.status(403).json(errorResponse)
        }
      })
      .exhaustive()
  }
}

/**
 * CSRFトークンを取得するハンドラー
 */
export function csrfTokenHandler(req: Request, res: Response): void {
  if (!req.session) {
    res.status(400).json({
      code: 'SESSION_REQUIRED',
      message: 'Session is required to generate CSRF token',
    })
    return
  }

  let token = getCsrfTokenFromSession(req)
  if (!token) {
    token = generateCsrfToken()
    saveCsrfTokenToSession(req, token)
  }

  res.json({ csrfToken: token })
}
