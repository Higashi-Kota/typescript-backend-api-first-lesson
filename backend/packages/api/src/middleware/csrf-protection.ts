/**
 * CSRF Protection Middleware
 * CSRF攻撃対策のためのミドルウェア
 */

import { randomBytes } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

// Express Sessionの型拡張
declare module 'express-session' {
  interface SessionData {
    _csrf?: string
  }
}

/**
 * CSRFトークンのヘッダー名
 */
const CSRF_HEADER_NAME = 'X-CSRF-Token'

/**
 * CSRFトークンを生成
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * CSRFトークンをセッションに保存
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
  if (req.session) {
    return req.session._csrf
  }
  return undefined
}

/**
 * リクエストからCSRFトークンを取得
 */
export function getCsrfTokenFromRequest(req: Request): string | undefined {
  // ヘッダーから取得
  const headerToken = req.headers[CSRF_HEADER_NAME.toLowerCase()] as string
  if (headerToken) {
    return headerToken
  }

  // ボディから取得
  if (req.body?._csrf) {
    return req.body._csrf
  }

  // クエリパラメータから取得
  if (req.query?._csrf) {
    return req.query._csrf as string
  }

  return undefined
}

/**
 * CSRF保護が必要なメソッドかチェック
 */
export function isMethodRequiresProtection(method: string): boolean {
  const protectedMethods = ['POST', 'PUT', 'DELETE', 'PATCH']
  return protectedMethods.includes(method.toUpperCase())
}

/**
 * CSRF保護から除外するパスかチェック
 */
export function isPathExcluded(path: string, excludePaths: string[]): boolean {
  return excludePaths.some((excludePath) => {
    if (excludePath.endsWith('*')) {
      return path.startsWith(excludePath.slice(0, -1))
    }
    return path === excludePath
  })
}

/**
 * CSRF保護ミドルウェアのオプション
 */
export interface CsrfProtectionOptions {
  excludePaths?: string[]
  cookie?: boolean
  sessionRequired?: boolean
}

/**
 * CSRF保護ミドルウェア
 */
export function csrfProtection(options: CsrfProtectionOptions = {}) {
  const {
    excludePaths = [
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/api/v1/auth/refresh',
    ],
    sessionRequired = true,
  } = options

  return (req: Request, res: Response, next: NextFunction) => {
    // 除外パスの場合はスキップ
    if (isPathExcluded(req.path, excludePaths)) {
      return next()
    }

    // GET, HEAD, OPTIONSリクエストの場合はトークンを生成して次へ
    if (!isMethodRequiresProtection(req.method)) {
      // セッションがある場合はトークンを生成
      if (req.session || !sessionRequired) {
        let token = getCsrfTokenFromSession(req)
        if (!token) {
          token = generateCsrfToken()
          saveCsrfTokenToSession(req, token)
        }
        // レスポンスヘッダーにトークンを設定
        res.setHeader(CSRF_HEADER_NAME, token)
      }
      return next()
    }

    // セッションが必要な場合はチェック
    if (sessionRequired && !req.session) {
      return res.status(403).json({
        code: 'SESSION_REQUIRED',
        message: 'Session is required for CSRF protection',
      })
    }

    // セッショントークンとリクエストトークンを比較
    const sessionToken = getCsrfTokenFromSession(req)
    const requestToken = getCsrfTokenFromRequest(req)

    if (!sessionToken || !requestToken || sessionToken !== requestToken) {
      return res.status(403).json({
        code: 'INVALID_CSRF_TOKEN',
        message: 'Invalid or missing CSRF token',
      })
    }

    // トークンが一致した場合は次へ
    next()
  }
}

/**
 * CSRFトークンを取得するエンドポイントハンドラー
 */
export function csrfTokenHandler(req: Request, res: Response) {
  if (!req.session) {
    return res.status(400).json({
      code: 'SESSION_REQUIRED',
      message: 'Session is required to generate CSRF token',
    })
  }

  let token = getCsrfTokenFromSession(req)
  if (!token) {
    token = generateCsrfToken()
    saveCsrfTokenToSession(req, token)
  }

  res.json({
    csrfToken: token,
  })
}
