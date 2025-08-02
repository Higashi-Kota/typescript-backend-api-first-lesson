import { randomBytes } from 'node:crypto'
import type {
  SessionId,
  SessionRepository,
  UserId,
  UserRepository,
  UserRole,
} from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import {
  type GetSessionsDeps,
  type LogoutAllDeps,
  type LogoutDeps,
  type RefreshTokenDeps,
  type RevokeSessionDeps,
  getSessions,
  logout,
  logoutAll,
  refreshToken,
  revokeSession,
} from '@beauty-salon-backend/usecase'
import { Router } from 'express'
import { match } from 'ts-pattern'
import type { AuthConfig } from '../middleware/auth.middleware.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { generalRateLimiter } from '../middleware/rate-limit.js'
import type { JwtService } from '../services/jwt.service.js'

export type SessionRouteDeps = {
  userRepository: UserRepository
  sessionRepository: SessionRepository
  jwtService: JwtService
  authConfig: AuthConfig
}

export const createSessionRoutes = (deps: SessionRouteDeps): Router => {
  const router = Router()

  // Logout current session
  router.post(
    '/logout',
    generalRateLimiter,
    authenticate(deps.authConfig),
    async (_req, res) => {
      // For now, we'll use a placeholder session ID
      // In a real implementation, this would come from the JWT payload
      const sessionId = 'current-session' as SessionId

      const logoutDeps: LogoutDeps = {
        sessionRepository: deps.sessionRepository,
      }

      const result = await logout({ sessionId }, logoutDeps)

      match(result)
        .with({ type: 'ok' }, () => {
          res.json({
            message: 'Logged out successfully',
          })
        })
        .with({ type: 'err', error: { type: 'sessionNotFound' } }, () => {
          res.status(404).json({
            error: {
              type: 'NOT_FOUND',
              message: 'Session not found',
            },
          })
        })
        .with({ type: 'err', error: { type: 'databaseError' } }, () => {
          res.status(500).json({
            error: {
              type: 'INTERNAL_SERVER_ERROR',
              message: 'Internal server error',
            },
          })
        })
        .exhaustive()
    }
  )

  // Logout all sessions
  router.post(
    '/logout-all',
    generalRateLimiter,
    authenticate(deps.authConfig),
    async (req, res) => {
      const logoutAllDeps: LogoutAllDeps = {
        sessionRepository: deps.sessionRepository,
      }

      const result = await logoutAll(
        { userId: req.user?.id as UserId },
        logoutAllDeps
      )

      match(result)
        .with({ type: 'ok' }, ({ value }) => {
          res.json({
            message: 'Logged out from all sessions successfully',
            deletedCount: value.deletedCount,
          })
        })
        .with({ type: 'err', error: { type: 'databaseError' } }, () => {
          res.status(500).json({
            error: {
              type: 'INTERNAL_SERVER_ERROR',
              message: 'Internal server error',
            },
          })
        })
        .exhaustive()
    }
  )

  // Refresh token
  router.post('/refresh', generalRateLimiter, async (req, res) => {
    const { refreshToken: token } = req.body as { refreshToken: string }

    if (token == null) {
      res.status(400).json({
        error: {
          type: 'BAD_REQUEST',
          message: 'Refresh token is required',
        },
      })
      return
    }

    const refreshDeps: RefreshTokenDeps = {
      sessionRepository: deps.sessionRepository,
      userRepository: deps.userRepository,
      generateAccessToken: (userId, email, role) => {
        const result = deps.jwtService.generateTokens({
          userId,
          email,
          role: role as UserRole,
        })
        return result.type === 'ok' ? result.value.accessToken : ''
      },
      generateRefreshToken: () => randomBytes(32).toString('hex'),
      accessTokenExpiresIn: 3600, // 1 hour
      updateSession: async (session, newRefreshToken) => {
        const updated = { ...session, refreshToken: newRefreshToken }
        const result = await deps.sessionRepository.update(updated)
        if (result.type === 'err') {
          return err({ type: 'updateFailed' as const, error: result.error })
        }
        return ok(result.value)
      },
    }

    const result = await refreshToken({ refreshToken: token }, refreshDeps)

    match(result)
      .with({ type: 'ok' }, ({ value }) => {
        res.json({
          accessToken: value.accessToken,
          refreshToken: value.refreshToken,
          expiresIn: value.expiresIn,
        })
      })
      .with({ type: 'err', error: { type: 'invalidRefreshToken' } }, () => {
        res.status(401).json({
          error: {
            type: 'UNAUTHORIZED',
            message: 'Invalid refresh token',
          },
        })
      })
      .with({ type: 'err', error: { type: 'sessionExpired' } }, () => {
        res.status(401).json({
          error: {
            type: 'UNAUTHORIZED',
            message: 'Session has expired',
          },
        })
      })
      .with({ type: 'err', error: { type: 'userNotFound' } }, () => {
        res.status(404).json({
          error: {
            type: 'NOT_FOUND',
            message: 'User not found',
          },
        })
      })
      .with({ type: 'err', error: { type: 'accountNotActive' } }, () => {
        res.status(403).json({
          error: {
            type: 'FORBIDDEN',
            message: 'Account is not active',
          },
        })
      })
      .with({ type: 'err', error: { type: 'databaseError' } }, () => {
        res.status(500).json({
          error: {
            type: 'INTERNAL_SERVER_ERROR',
            message: 'Internal server error',
          },
        })
      })
      .exhaustive()
  })

  // Get active sessions
  router.get(
    '/sessions',
    generalRateLimiter,
    authenticate(deps.authConfig),
    async (req, res) => {
      const getSessionsDeps: GetSessionsDeps = {
        sessionRepository: deps.sessionRepository,
        currentSessionId: 'current-session', // Placeholder
      }

      const result = await getSessions(
        { userId: req.user?.id as UserId },
        getSessionsDeps
      )

      match(result)
        .with({ type: 'ok' }, ({ value }) => {
          res.json({
            sessions: value.sessions,
            total: value.total,
          })
        })
        .with({ type: 'err', error: { type: 'databaseError' } }, () => {
          res.status(500).json({
            error: {
              type: 'INTERNAL_SERVER_ERROR',
              message: 'Internal server error',
            },
          })
        })
        .exhaustive()
    }
  )

  // Revoke specific session
  router.delete(
    '/sessions/:sessionId',
    generalRateLimiter,
    authenticate(deps.authConfig),
    async (req, res) => {
      const sessionId = req.params.sessionId as SessionId

      const revokeDeps: RevokeSessionDeps = {
        sessionRepository: deps.sessionRepository,
      }

      const result = await revokeSession(
        {
          sessionId,
          userId: req.user?.id as UserId,
        },
        revokeDeps
      )

      match(result)
        .with({ type: 'ok' }, () => {
          res.json({
            message: 'Session revoked successfully',
          })
        })
        .with({ type: 'err', error: { type: 'sessionNotFound' } }, () => {
          res.status(404).json({
            error: {
              type: 'NOT_FOUND',
              message: 'Session not found',
            },
          })
        })
        .with({ type: 'err', error: { type: 'notOwner' } }, () => {
          res.status(403).json({
            error: {
              type: 'FORBIDDEN',
              message: 'You can only revoke your own sessions',
            },
          })
        })
        .with({ type: 'err', error: { type: 'databaseError' } }, () => {
          res.status(500).json({
            error: {
              type: 'INTERNAL_SERVER_ERROR',
              message: 'Internal server error',
            },
          })
        })
        .exhaustive()
    }
  )

  return router
}
