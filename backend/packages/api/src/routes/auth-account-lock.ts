import type { UserId, UserRepository } from '@beauty-salon-backend/domain'
import {
  type UnlockAccountDeps,
  unlockAccount,
} from '@beauty-salon-backend/domain/business-logic'
import { Router } from 'express'
import { match } from 'ts-pattern'
import type { AuthConfig } from '../middleware/auth.middleware'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { adminRateLimiter } from '../middleware/rate-limit'

export type AccountLockRouteDeps = {
  userRepository: UserRepository
  authConfig: AuthConfig
}

export const createAccountLockRoutes = (deps: AccountLockRouteDeps): Router => {
  const router = Router()

  const unlockDeps: UnlockAccountDeps = {
    userRepository: deps.userRepository,
  }

  // Admin endpoint to unlock a user account
  router.post(
    '/unlock/:userId',
    adminRateLimiter,
    authenticate(deps.authConfig),
    authorize('admin'),
    async (req, res) => {
      const userId = req.params.userId as UserId

      const result = await unlockAccount(
        {
          userId,
          adminUserId: req.user?.id as UserId,
        },
        unlockDeps
      )

      match(result)
        .with({ type: 'ok' }, () => {
          res.json({
            message: 'Account unlocked successfully',
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
        .with({ type: 'err', error: { type: 'adminNotFound' } }, () => {
          res.status(404).json({
            error: {
              type: 'NOT_FOUND',
              message: 'Admin user not found',
            },
          })
        })
        .with({ type: 'err', error: { type: 'notAdmin' } }, () => {
          res.status(403).json({
            error: {
              type: 'FORBIDDEN',
              message: 'Only admins can unlock accounts',
            },
          })
        })
        .with({ type: 'err', error: { type: 'accountNotLocked' } }, () => {
          res.status(409).json({
            error: {
              type: 'CONFLICT',
              message: 'Account is not locked',
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

  // Get lock status for a user (admin only)
  router.get(
    '/lock-status/:userId',
    adminRateLimiter,
    authenticate(deps.authConfig),
    authorize('admin'),
    async (req, res) => {
      const userId = req.params.userId as UserId

      const userResult = await deps.userRepository.findById(userId)

      match(userResult)
        .with(
          { type: 'ok', value: { status: { type: 'locked' } } },
          ({ value }) => {
            const status = value?.status
            if (status.type === 'locked') {
              const lockExpiry = new Date(
                status.lockedAt.getTime() + 30 * 60 * 1000
              ) // 30 minutes
              res.json({
                isLocked: true,
                lockedAt: status.lockedAt,
                reason: status.reason,
                failedAttempts: status.failedAttempts,
                expiresAt: lockExpiry,
              })
            }
          }
        )
        .with({ type: 'ok' }, ({ value }) => {
          res.json({
            isLocked: false,
            status: value?.status.type,
          })
        })
        .with({ type: 'err', error: { type: 'notFound' } }, () => {
          res.status(404).json({
            error: {
              type: 'NOT_FOUND',
              message: 'User not found',
            },
          })
        })
        .with({ type: 'err' }, () => {
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
