/**
 * JWT Service
 * JWT token generation and validation
 */

import type { Result } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import jwt from 'jsonwebtoken'
import type { StringValue } from 'ms'
import ms from 'ms'

export interface JwtPayload {
  userId: string
  email: string
  role: string
}

export interface JwtConfig {
  accessTokenSecret: string
  refreshTokenSecret: string
  accessTokenExpiresIn: StringValue
  refreshTokenExpiresIn: StringValue
}

export class JwtService {
  constructor(private readonly config: JwtConfig) {}

  generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, this.config.accessTokenSecret, {
      expiresIn: this.config.accessTokenExpiresIn,
    })
  }

  generateRefreshToken(userId: string): string {
    return jwt.sign({ userId }, this.config.refreshTokenSecret, {
      expiresIn: this.config.refreshTokenExpiresIn,
    })
  }

  verifyAccessToken(
    token: string
  ): Result<JwtPayload, { type: 'invalid' | 'expired'; message: string }> {
    try {
      const decoded = jwt.verify(
        token,
        this.config.accessTokenSecret
      ) as JwtPayload
      return ok(decoded)
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return err({ type: 'expired', message: 'Token has expired' })
      }
      return err({ type: 'invalid', message: 'Invalid token' })
    }
  }

  verifyRefreshToken(
    token: string
  ): Result<
    { userId: string },
    { type: 'invalid' | 'expired'; message: string }
  > {
    try {
      const decoded = jwt.verify(token, this.config.refreshTokenSecret) as {
        userId: string
      }
      return ok(decoded)
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return err({ type: 'expired', message: 'Refresh token has expired' })
      }
      return err({ type: 'invalid', message: 'Invalid refresh token' })
    }
  }

  getExpiresInMs(expiresIn: StringValue): number {
    return ms(expiresIn)
  }

  generateTokenPair(payload: JwtPayload): {
    accessToken: string
    refreshToken: string
    expiresIn: number
  } {
    const accessToken = this.generateAccessToken(payload)
    const refreshToken = this.generateRefreshToken(payload.userId)
    const expiresIn = this.getExpiresInMs(this.config.accessTokenExpiresIn)

    return {
      accessToken,
      refreshToken,
      expiresIn,
    }
  }
}
