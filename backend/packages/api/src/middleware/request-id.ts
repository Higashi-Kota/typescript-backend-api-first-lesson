/**
 * Request ID ミドルウェア
 * リクエストごとに一意のIDを生成し、トレーシングに使用
 */

import { randomUUID } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

export const requestId = () => {
  return (
    req: Request & { id?: string },
    res: Response,
    next: NextFunction
  ): void => {
    const id = (req.headers['x-request-id'] as string) || randomUUID()
    req.id = id
    res.setHeader('X-Request-ID', id)
    next()
  }
}
