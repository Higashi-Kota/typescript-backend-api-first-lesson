/**
 * Request ID ミドルウェア
 * リクエストごとに一意のIDを生成し、トレーシングに使用
 */

import { randomUUID } from 'node:crypto'
import type { RequestHandler } from 'express'
import { createHeaderParser } from '../utils/headers.js'

// Expressの拡張型定義
declare global {
  namespace Express {
    interface Request {
      id?: string
    }
  }
}

export const requestId: RequestHandler = (req, res, next) => {
  const headerParser = createHeaderParser(req.headers)
  const id = headerParser.getWithDefault('x-request-id', randomUUID())

  req.id = id
  res.setHeader('X-Request-ID', id)
  next()
}
