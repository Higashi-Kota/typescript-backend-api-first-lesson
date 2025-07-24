/**
 * Authentication & Authorization Middleware
 * 認証・認可ミドルウェア
 * CLAUDEガイドラインに準拠した実装
 */

import type { Result } from '@beauty-salon-backend/domain'
import { createUserId, err, ok } from '@beauty-salon-backend/domain'
import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { match } from 'ts-pattern'
import { z } from 'zod'
import { createHeaderParser } from '../utils/headers.js'

// JWT ペイロードの型定義
export type JwtPayload = {
  sub: string // User ID
  email: string
  role: UserRole
  iat?: number
  exp?: number
}

// ユーザーロールの定義
export type UserRole = 'customer' | 'staff' | 'admin'

// 認証設定の型
export type AuthConfig = {
  jwtSecret: string
  jwtExpiresIn?: string
}

// 認証エラーの型
export type AuthError =
  | { type: 'missingToken'; message: string }
  | { type: 'invalidToken'; message: string }
  | { type: 'tokenExpired'; message: string }
  | { type: 'insufficientPermission'; message: string }

// JWT トークンの検証
export const verifyToken = (
  token: string,
  secret: string
): Result<JwtPayload, AuthError> => {
  try {
    const decoded = jwt.verify(token, secret)

    // Zod スキーマで検証
    const payloadSchema = z.object({
      sub: z.string(),
      email: z.string().email(),
      role: z.enum(['customer', 'staff', 'admin']),
      iat: z.number().optional(),
      exp: z.number().optional(),
    })

    const parseResult = payloadSchema.safeParse(decoded)
    if (!parseResult.success) {
      return err({
        type: 'invalidToken',
        message: 'Invalid token payload',
      })
    }

    return ok(parseResult.data)
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return err({
        type: 'tokenExpired',
        message: 'Token has expired',
      })
    }

    return err({
      type: 'invalidToken',
      message: 'Invalid token',
    })
  }
}

// トークンの抽出
export const extractToken = (
  authHeader?: string
): Result<string, AuthError> => {
  if (authHeader === undefined || authHeader === null) {
    return err({
      type: 'missingToken',
      message: 'Authorization header is missing',
    })
  }

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return err({
      type: 'invalidToken',
      message: 'Invalid authorization header format',
    })
  }

  return ok(parts[1] ?? '')
}

/**
 * 認証ミドルウェア
 * JWTトークンを検証し、ユーザー情報をリクエストに付加
 */
export const authenticate = (config: AuthConfig) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // トークンの抽出
    const headerParser = createHeaderParser(req.headers)
    const authHeader = headerParser.get('authorization')
    const tokenResult = extractToken(authHeader)
    if (tokenResult.type === 'err') {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: tokenResult.error.message,
      })
    }

    // トークンの検証
    const payloadResult = verifyToken(tokenResult.value, config.jwtSecret)
    if (payloadResult.type === 'err') {
      const statusCode = match(payloadResult.error.type)
        .with('tokenExpired', () => 401)
        .with('invalidToken', () => 401)
        .with('missingToken', () => 401)
        .otherwise(() => 401)

      return res.status(statusCode).json({
        code: 'UNAUTHORIZED',
        message: payloadResult.error.message,
      })
    }

    // ユーザー情報をリクエストに付加
    req.user = {
      id: createUserId(payloadResult.value.sub),
      email: payloadResult.value.email,
      role: payloadResult.value.role,
    }

    next()
  }
}

/**
 * 認可ミドルウェア
 * 必要なロールを持っているかチェック
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      })
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
      })
    }

    next()
  }
}

/**
 * オプショナル認証ミドルウェア
 * トークンがある場合のみ検証し、なくても次へ進む
 */
export const optionalAuthenticate = (config: AuthConfig) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const headerParser = createHeaderParser(req.headers)
    const authHeader = headerParser.get('authorization')

    if (!authHeader) {
      // 認証ヘッダーがない場合は認証なしで次へ
      return next()
    }

    // トークンの抽出
    const tokenResult = extractToken(authHeader)
    if (tokenResult.type === 'err') {
      // トークンフォーマットが不正な場合はエラー
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: tokenResult.error.message,
      })
    }

    // トークンの検証
    const payloadResult = verifyToken(tokenResult.value, config.jwtSecret)
    if (payloadResult.type === 'err') {
      // トークンが無効な場合はエラー
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: payloadResult.error.message,
      })
    }

    // ユーザー情報をリクエストに付加
    req.user = {
      id: createUserId(payloadResult.value.sub),
      email: payloadResult.value.email,
      role: payloadResult.value.role,
    }

    next()
  }
}

/**
 * リソースオーナーチェックミドルウェア
 * リクエストユーザーがリソースのオーナーであることを確認
 */
export const checkResourceOwner = (
  getResourceOwnerId: (req: Request) => string | undefined
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      })
    }

    const ownerId = getResourceOwnerId(req)
    if (!ownerId) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Resource not found',
      })
    }

    // 管理者は全てのリソースにアクセス可能
    if (req.user.role === 'admin') {
      return next()
    }

    // オーナーチェック
    if (req.user.id !== ownerId) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Access denied to this resource',
      })
    }

    next()
  }
}

/**
 * エラーレスポンスの作成
 */
export const createAuthErrorResponse = (
  error: AuthError
): { code: string; message: string } => {
  return match(error)
    .with({ type: 'missingToken' }, (e) => ({
      code: 'MISSING_TOKEN',
      message: e.message,
    }))
    .with({ type: 'invalidToken' }, (e) => ({
      code: 'INVALID_TOKEN',
      message: e.message,
    }))
    .with({ type: 'tokenExpired' }, (e) => ({
      code: 'TOKEN_EXPIRED',
      message: e.message,
    }))
    .with({ type: 'insufficientPermission' }, (e) => ({
      code: 'INSUFFICIENT_PERMISSION',
      message: e.message,
    }))
    .exhaustive()
}
