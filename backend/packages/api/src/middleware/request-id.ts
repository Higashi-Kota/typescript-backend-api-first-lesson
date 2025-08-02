/**
 * Request ID ミドルウェア
 * リクエストごとに一意のIDを生成し、トレーシングに使用
 */

import { randomUUID } from 'node:crypto'
import type { RequestHandler } from 'express'

// Expressの拡張型定義
declare global {
  namespace Express {
    interface Request {
      id?: string
    }
  }
}

export const requestId: RequestHandler = (req, res, next) => {
  const id = (req.headers['x-request-id'] as string) ?? randomUUID()
  req.id = id
  res.setHeader('X-Request-ID', id)
  next()
}
