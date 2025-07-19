/**
 * HTTPS Redirect Middleware
 * HTTPリクエストをHTTPSにリダイレクト
 */

import type { CookieOptions, NextFunction, Request, Response } from 'express'

/**
 * プロキシからの転送ヘッダーを信頼するかどうか
 */
export interface HttpsRedirectOptions {
  trustProxy?: boolean
  excludePaths?: string[]
  redirectStatusCode?: 301 | 302
}

/**
 * リクエストがHTTPSかどうかを判定
 */
export function isSecureRequest(req: Request, trustProxy = true): boolean {
  // 直接HTTPS接続
  if (req.secure) {
    return true
  }

  // プロキシ経由の場合（AWS ALB、Cloudflare、nginx等）
  if (trustProxy) {
    // X-Forwarded-Protoヘッダーをチェック
    const forwardedProto = req.headers['x-forwarded-proto']
    if (forwardedProto === 'https') {
      return true
    }

    // CloudFlareのCF-Visitor ヘッダーをチェック
    const cfVisitor = req.headers['cf-visitor']
    if (cfVisitor && typeof cfVisitor === 'string') {
      try {
        const visitor = JSON.parse(cfVisitor)
        if (visitor.scheme === 'https') {
          return true
        }
      } catch {
        // パースエラーは無視
      }
    }
  }

  return false
}

/**
 * HTTPSリダイレクトミドルウェア
 */
export function httpsRedirect(options: HttpsRedirectOptions = {}) {
  const {
    trustProxy = true,
    excludePaths = ['/health', '/metrics'],
    redirectStatusCode = 301,
  } = options

  return (req: Request, res: Response, next: NextFunction) => {
    // 開発環境では無効化
    if (process.env.NODE_ENV === 'development') {
      return next()
    }

    // 除外パスの場合はスキップ
    if (excludePaths.some((path) => req.path.startsWith(path))) {
      return next()
    }

    // HTTPSでない場合はリダイレクト
    if (!isSecureRequest(req, trustProxy)) {
      const host = req.headers.host || 'localhost'
      const httpsUrl = `https://${host}${req.originalUrl}`
      return res.redirect(redirectStatusCode, httpsUrl)
    }

    // HTTPSの場合はHSTSヘッダーを設定
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )

    next()
  }
}

/**
 * セキュアクッキー設定を強制するミドルウェア
 */
export function enforceSecureCookies(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  // 本番環境でのみ有効
  if (process.env.NODE_ENV === 'production') {
    // res.cookieメソッドをオーバーライド
    const originalCookie = res.cookie.bind(res)
    res.cookie = (name: string, value: string, options: CookieOptions = {}) => {
      // セキュアフラグを強制
      options.secure = true
      // httpOnlyフラグをデフォルトで有効化
      if (options.httpOnly === undefined) {
        options.httpOnly = true
      }
      // sameSiteをデフォルトで'strict'に設定
      if (options.sameSite === undefined) {
        options.sameSite = 'strict'
      }
      return originalCookie(name, value, options)
    }
  }

  next()
}
