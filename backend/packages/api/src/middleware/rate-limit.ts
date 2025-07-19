import type { Request, Response } from 'express'
import rateLimit from 'express-rate-limit'

// APIレートリミットの共通設定
const createRateLimiter = (
  windowMs: number,
  max: number,
  message: string,
  skipSuccessfulRequests = false
) => {
  return rateLimit({
    windowMs,
    max,
    message,
    skipSuccessfulRequests,
    standardHeaders: true, // `RateLimit-*` headers
    legacyHeaders: false, // `X-RateLimit-*` headers
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        code: 'RATE_LIMIT_EXCEEDED',
        message,
        retryAfter: res.getHeader('Retry-After'),
      })
    },
  })
}

// 通常のAPIエンドポイント用
export const generalRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15分
  100, // 最大100リクエスト
  'Too many requests from this IP, please try again after 15 minutes.'
)

// 認証エンドポイント用（より厳しい制限）
export const authRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15分
  5, // 最大5リクエスト
  'Too many authentication attempts from this IP, please try again after 15 minutes.',
  true // 成功したリクエストはカウントしない
)

// パスワードリセット用（最も厳しい制限）
export const passwordResetRateLimiter = createRateLimiter(
  60 * 60 * 1000, // 1時間
  3, // 最大3リクエスト
  'Too many password reset attempts from this IP, please try again after 1 hour.'
)

// ファイルアップロード用
export const uploadRateLimiter = createRateLimiter(
  60 * 60 * 1000, // 1時間
  20, // 最大20リクエスト
  'Too many upload requests from this IP, please try again after 1 hour.'
)

// 検索API用（緩い制限）
export const searchRateLimiter = createRateLimiter(
  1 * 60 * 1000, // 1分
  30, // 最大30リクエスト
  'Too many search requests from this IP, please try again after 1 minute.'
)

// 管理者API用（認証済みユーザーのみ）
export const adminRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15分
  200, // 最大200リクエスト
  'Too many admin requests from this IP, please try again after 15 minutes.'
)
