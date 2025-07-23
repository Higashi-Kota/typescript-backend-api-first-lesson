/**
 * Express Request型の拡張
 */

import type { Request, Response } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import type { UserRole } from '../middleware/auth.middleware.js'

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        role: UserRole
      }
      requestId?: string
    }
  }
}

export interface TypedRequest<
  Body = unknown,
  Query = qs.ParsedQs,
  Params = ParamsDictionary
> extends Request<Params, unknown, Body, Query> {}

export interface TypedResponse<Body = unknown> extends Response<Body> {}

export {}