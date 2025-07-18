/**
 * JWT Service
 * JWT トークンの生成・管理
 * CLAUDEガイドラインに準拠した実装
 */

import type { Result } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import jwt from 'jsonwebtoken'
import ms from 'ms'
import type { StringValue } from 'ms'
import type { JwtPayload, UserRole } from '../middleware/auth.middleware.js'

// トークン生成の入力型
export type GenerateTokenInput = {
  userId: string
  email: string
  role: UserRole
}

// トークン生成エラーの型
export type TokenError = {
  type: 'tokenGenerationFailed'
  message: string
}

// トークンペアの型
export type TokenPair = {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

// JWT サービスの設定
export type JwtServiceConfig = {
  accessTokenSecret: string
  refreshTokenSecret: string
  accessTokenExpiresIn: StringValue
  refreshTokenExpiresIn: StringValue
}

/**
 * アクセストークンの生成
 */
export const generateAccessToken = (
  input: GenerateTokenInput,
  secret: string,
  expiresIn: StringValue
): Result<string, TokenError> => {
  try {
    const payload: JwtPayload = {
      sub: input.userId,
      email: input.email,
      role: input.role,
    }

    const token = jwt.sign(payload, secret, {
      expiresIn,
      issuer: 'beauty-salon-api',
      audience: 'beauty-salon-client',
    })

    return ok(token)
  } catch (error) {
    return err({
      type: 'tokenGenerationFailed',
      message:
        error instanceof Error ? error.message : 'Failed to generate token',
    })
  }
}

/**
 * リフレッシュトークンの生成
 */
export const generateRefreshToken = (
  userId: string,
  secret: string,
  expiresIn: StringValue
): Result<string, TokenError> => {
  try {
    const payload = {
      sub: userId,
      type: 'refresh',
    }

    const token = jwt.sign(payload, secret, {
      expiresIn,
      issuer: 'beauty-salon-api',
      audience: 'beauty-salon-client',
    })

    return ok(token)
  } catch (error) {
    return err({
      type: 'tokenGenerationFailed',
      message:
        error instanceof Error
          ? error.message
          : 'Failed to generate refresh token',
    })
  }
}

/**
 * トークンペアの生成
 */
export const generateTokenPair = (
  input: GenerateTokenInput,
  config: JwtServiceConfig
): Result<TokenPair, TokenError> => {
  // アクセストークンの生成
  const accessTokenResult = generateAccessToken(
    input,
    config.accessTokenSecret,
    config.accessTokenExpiresIn
  )
  if (accessTokenResult.type === 'err') {
    return accessTokenResult
  }

  // リフレッシュトークンの生成
  const refreshTokenResult = generateRefreshToken(
    input.userId,
    config.refreshTokenSecret,
    config.refreshTokenExpiresIn
  )
  if (refreshTokenResult.type === 'err') {
    return refreshTokenResult
  }

  // 有効期限の計算（秒単位）
  const expiresIn = parseExpiresIn(config.accessTokenExpiresIn)

  return ok({
    accessToken: accessTokenResult.value,
    refreshToken: refreshTokenResult.value,
    expiresIn,
  })
}

/**
 * リフレッシュトークンの検証
 */
export const verifyRefreshToken = (
  token: string,
  secret: string
): Result<{ userId: string }, TokenError> => {
  try {
    const decoded = jwt.verify(token, secret) as {
      sub: string
      type: string
    }

    if (decoded.type !== 'refresh') {
      return err({
        type: 'tokenGenerationFailed',
        message: 'Invalid token type',
      })
    }

    return ok({ userId: decoded.sub })
  } catch (error) {
    return err({
      type: 'tokenGenerationFailed',
      message: error instanceof Error ? error.message : 'Invalid refresh token',
    })
  }
}

/**
 * expiresIn文字列を秒に変換
 */
const parseExpiresIn = (expiresIn: StringValue): number => {
  const milliseconds = ms(expiresIn)
  // msパッケージはミリ秒を返すので、1000で割って秒に変換
  return Math.floor(milliseconds / 1000)
}

/**
 * JWT サービスクラス
 */
export class JwtService {
  constructor(private readonly config: JwtServiceConfig) {}

  generateTokens(input: GenerateTokenInput): Result<TokenPair, TokenError> {
    return generateTokenPair(input, this.config)
  }

  verifyRefreshToken(token: string): Result<{ userId: string }, TokenError> {
    return verifyRefreshToken(token, this.config.refreshTokenSecret)
  }

  async refreshTokens(
    refreshToken: string,
    getUserData: (userId: string) => Promise<GenerateTokenInput | null>
  ): Promise<Result<TokenPair, TokenError>> {
    // リフレッシュトークンの検証
    const verifyResult = this.verifyRefreshToken(refreshToken)
    if (verifyResult.type === 'err') {
      return verifyResult
    }

    // ユーザー情報の取得
    const userData = await getUserData(verifyResult.value.userId)
    if (!userData) {
      return err({
        type: 'tokenGenerationFailed',
        message: 'User not found',
      })
    }

    // 新しいトークンペアの生成
    return this.generateTokens(userData)
  }
}
