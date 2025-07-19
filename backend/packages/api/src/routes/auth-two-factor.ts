import type { UserId, UserRepository } from '@beauty-salon-backend/domain'
import { generateBackupCodes } from '@beauty-salon-backend/domain'
import {
  type DisableTwoFactorDeps,
  type RegenerateBackupCodesDeps,
  type SetupTwoFactorDeps,
  type VerifyTwoFactorDeps,
  disableTwoFactor,
  regenerateBackupCodes,
  setupTwoFactor,
  verifyTwoFactor,
} from '@beauty-salon-backend/usecase'
import bcrypt from 'bcrypt'
import { Router } from 'express'
import { match } from 'ts-pattern'
import type { AuthConfig } from '../middleware/auth.middleware.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { authRateLimiter } from '../middleware/rate-limit.js'

export type TwoFactorRouteDeps = {
  userRepository: UserRepository
  authConfig: AuthConfig
  appName: string
}

export const createTwoFactorRoutes = (deps: TwoFactorRouteDeps): Router => {
  const router = Router()

  // Setup 2FA dependencies
  const setupDeps: SetupTwoFactorDeps = {
    userRepository: deps.userRepository,
    verifyPassword: async (password, hash) => bcrypt.compare(password, hash),
    generateBackupCodes: () => generateBackupCodes(8),
    appName: deps.appName,
  }

  const verifyDeps: VerifyTwoFactorDeps = {
    userRepository: deps.userRepository,
    generateBackupCodes: () => generateBackupCodes(8),
  }

  const disableDeps: DisableTwoFactorDeps = {
    userRepository: deps.userRepository,
    verifyPassword: async (password, hash) => bcrypt.compare(password, hash),
  }

  const regenerateDeps: RegenerateBackupCodesDeps = {
    userRepository: deps.userRepository,
    generateBackupCodes: () => generateBackupCodes(8),
  }

  // Enable 2FA - Step 1: Generate secret and QR code
  router.post(
    '/2fa/enable',
    authRateLimiter,
    authenticate(deps.authConfig),
    async (req, res) => {
      const password = req.body.password as string

      if (!password) {
        res.status(400).json({
          error: {
            type: 'BAD_REQUEST',
            message: 'Password is required',
          },
        })
        return
      }

      const result = await setupTwoFactor(
        {
          userId: req.user?.id as UserId,
          password,
        },
        setupDeps
      )

      match(result)
        .with({ type: 'ok' }, ({ value }) => {
          res.json({
            secret: value.secret,
            qrCodeUrl: value.qrCodeUrl,
            backupCodes: value.backupCodes,
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
        .with({ type: 'err', error: { type: 'invalidPassword' } }, () => {
          res.status(401).json({
            error: {
              type: 'UNAUTHORIZED',
              message: 'Invalid password',
            },
          })
        })
        .with(
          { type: 'err', error: { type: 'twoFactorAlreadyEnabled' } },
          () => {
            res.status(409).json({
              error: {
                type: 'CONFLICT',
                message: 'Two-factor authentication is already enabled',
              },
            })
          }
        )
        .with({ type: 'err', error: { type: 'accountNotActive' } }, () => {
          res.status(403).json({
            error: {
              type: 'FORBIDDEN',
              message: 'Account is not active',
            },
          })
        })
        .with({ type: 'err', error: { type: 'emailNotVerified' } }, () => {
          res.status(403).json({
            error: {
              type: 'FORBIDDEN',
              message: 'Email must be verified before enabling 2FA',
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

  // Get QR code for existing pending 2FA setup
  router.get(
    '/2fa/qr-code',
    authRateLimiter,
    authenticate(deps.authConfig),
    async (req, res) => {
      const userResult = await deps.userRepository.findById(
        req.user?.id as UserId
      )

      match(userResult)
        .with(
          {
            type: 'ok',
            value: { data: { twoFactorStatus: { type: 'pending' } } },
          },
          ({ value }) => {
            const status = value.data.twoFactorStatus
            if (status.type === 'pending') {
              res.json({
                secret: status.secret,
                qrCodeUrl: status.qrCodeUrl,
              })
            }
          }
        )
        .with({ type: 'ok' }, () => {
          res.status(404).json({
            error: {
              type: 'NOT_FOUND',
              message: 'No pending 2FA setup found',
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

  // Verify 2FA - Step 2: Verify TOTP code and enable 2FA
  router.post(
    '/2fa/verify',
    authRateLimiter,
    authenticate(deps.authConfig),
    async (req, res) => {
      const code = req.body.code as string

      if (!code) {
        res.status(400).json({
          error: {
            type: 'BAD_REQUEST',
            message: 'Code is required',
          },
        })
        return
      }

      const result = await verifyTwoFactor(
        {
          userId: req.user?.id as UserId,
          code,
        },
        verifyDeps
      )

      match(result)
        .with({ type: 'ok' }, ({ value }) => {
          res.json({
            message: 'Two-factor authentication enabled successfully',
            backupCodes: value.backupCodes,
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
        .with({ type: 'err', error: { type: 'invalidCode' } }, () => {
          res.status(401).json({
            error: {
              type: 'UNAUTHORIZED',
              message: 'Invalid verification code',
            },
          })
        })
        .with({ type: 'err', error: { type: 'twoFactorNotPending' } }, () => {
          res.status(409).json({
            error: {
              type: 'CONFLICT',
              message: 'Two-factor authentication setup not in progress',
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
    }
  )

  // Disable 2FA
  router.post(
    '/2fa/disable',
    authRateLimiter,
    authenticate(deps.authConfig),
    async (req, res) => {
      const { password, code } = req.body as { password: string; code: string }

      if (!password || !code) {
        res.status(400).json({
          error: {
            type: 'BAD_REQUEST',
            message: 'Password and code are required',
          },
        })
        return
      }

      const result = await disableTwoFactor(
        {
          userId: req.user?.id as UserId,
          password,
          code,
        },
        disableDeps
      )

      match(result)
        .with({ type: 'ok' }, () => {
          res.json({
            message: 'Two-factor authentication disabled successfully',
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
        .with({ type: 'err', error: { type: 'invalidPassword' } }, () => {
          res.status(401).json({
            error: {
              type: 'UNAUTHORIZED',
              message: 'Invalid password',
            },
          })
        })
        .with({ type: 'err', error: { type: 'invalidCode' } }, () => {
          res.status(401).json({
            error: {
              type: 'UNAUTHORIZED',
              message: 'Invalid verification code',
            },
          })
        })
        .with({ type: 'err', error: { type: 'twoFactorNotEnabled' } }, () => {
          res.status(409).json({
            error: {
              type: 'CONFLICT',
              message: 'Two-factor authentication is not enabled',
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
    }
  )

  // Regenerate backup codes
  router.post(
    '/2fa/backup-codes',
    authRateLimiter,
    authenticate(deps.authConfig),
    async (req, res) => {
      const code = req.body.code as string

      if (!code) {
        res.status(400).json({
          error: {
            type: 'BAD_REQUEST',
            message: 'Code is required',
          },
        })
        return
      }

      const result = await regenerateBackupCodes(
        {
          userId: req.user?.id as UserId,
          code,
        },
        regenerateDeps
      )

      match(result)
        .with({ type: 'ok' }, ({ value }) => {
          res.json({
            message: 'Backup codes regenerated successfully',
            backupCodes: value.backupCodes,
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
        .with({ type: 'err', error: { type: 'invalidCode' } }, () => {
          res.status(401).json({
            error: {
              type: 'UNAUTHORIZED',
              message: 'Invalid verification code',
            },
          })
        })
        .with({ type: 'err', error: { type: 'twoFactorNotEnabled' } }, () => {
          res.status(409).json({
            error: {
              type: 'CONFLICT',
              message: 'Two-factor authentication is not enabled',
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
    }
  )

  return router
}
