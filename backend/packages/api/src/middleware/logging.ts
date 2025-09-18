/**
 * ロギングミドルウェア
 * リクエスト/レスポンスの自動ログ記録
 */

import type { NextFunction, Request, Response } from 'express'
import { createStructuredLogger } from '../utils/structured-logger'

const logger = createStructuredLogger('http')

// リクエスト情報を拡張
declare module 'express-serve-static-core' {
  interface Request {
    startTime?: number
  }
}

export function loggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // リクエスト開始時刻を記録
  req.startTime = Date.now()

  // リクエストログ
  const userId = req.user?.id
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'

  logger.logRequest(req.method, req.path, userId, ip)

  // レスポンスログ（レスポンス完了時）
  const originalSend = res.send
  res.send = (data: unknown): Response => {
    res.send = originalSend

    // レスポンス時間を計算
    const duration = req.startTime ? Date.now() - req.startTime : 0

    // レスポンスログを記録
    logger.logResponse(res.statusCode, duration, req.path)

    return res.send(data)
  }

  next()
}

// エラーロギング用のミドルウェア
export function errorLoggingMiddleware(
  error: Error,
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const context = {
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    ip: req.ip ?? req.socket.remoteAddress ?? 'unknown',
    headers: {
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
    },
  }

  logger.logError(error, context)
  next(error)
}
