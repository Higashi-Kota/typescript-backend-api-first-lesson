import type { UserId, UserRepository } from '@beauty-salon-backend/domain'
import {
  type AddTrustedIpDeps,
  type CheckIpRestrictionDeps,
  type RemoveTrustedIpDeps,
  addTrustedIp,
  checkIpRestriction,
  removeTrustedIp,
} from '@beauty-salon-backend/usecase'
import { Router } from 'express'
import { match } from 'ts-pattern'
import type { AuthConfig } from '../middleware/auth.middleware.js'
import { authenticate, authorize } from '../middleware/auth.middleware.js'

export type IpRestrictionRouteDeps = {
  userRepository: UserRepository
  authConfig: AuthConfig
  maxTrustedIps?: number
  ipRestrictionEnabled?: boolean
}

export const createIpRestrictionRoutes = (
  deps: IpRestrictionRouteDeps
): Router => {
  const router = Router()

  // Add trusted IP address (admin only)
  router.post(
    '/trusted-ip/:userId',
    authenticate(deps.authConfig),
    authorize('admin'),
    async (req, res) => {
      const userId = req.params.userId as UserId
      const { ipAddress } = req.body as { ipAddress: string }

      if (!ipAddress) {
        res.status(400).json({
          error: {
            type: 'BAD_REQUEST',
            message: 'IP address is required',
          },
        })
        return
      }

      const addTrustedIpDeps: AddTrustedIpDeps = {
        userRepository: deps.userRepository,
        maxTrustedIps: deps.maxTrustedIps || 10,
      }

      const result = await addTrustedIp(
        {
          userId,
          ipAddress,
          adminUserId: req.user?.id as UserId,
        },
        addTrustedIpDeps
      )

      match(result)
        .with({ type: 'ok' }, () => {
          res.json({
            message: 'Trusted IP address added successfully',
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
              message: 'Only admins can manage trusted IPs',
            },
          })
        })
        .with({ type: 'err', error: { type: 'invalidIpAddress' } }, () => {
          res.status(400).json({
            error: {
              type: 'BAD_REQUEST',
              message: 'Invalid IP address format',
            },
          })
        })
        .with({ type: 'err', error: { type: 'ipAlreadyTrusted' } }, () => {
          res.status(409).json({
            error: {
              type: 'CONFLICT',
              message: 'IP address is already trusted',
            },
          })
        })
        .with({ type: 'err', error: { type: 'maxTrustedIpsReached' } }, () => {
          res.status(409).json({
            error: {
              type: 'CONFLICT',
              message: 'Maximum number of trusted IPs reached',
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

  // Remove trusted IP address (admin only)
  router.delete(
    '/trusted-ip/:userId',
    authenticate(deps.authConfig),
    authorize('admin'),
    async (req, res) => {
      const userId = req.params.userId as UserId
      const ipAddress = req.query.ipAddress as string

      if (!ipAddress) {
        res.status(400).json({
          error: {
            type: 'BAD_REQUEST',
            message: 'IP address is required',
          },
        })
        return
      }

      const removeTrustedIpDeps: RemoveTrustedIpDeps = {
        userRepository: deps.userRepository,
      }

      const result = await removeTrustedIp(
        {
          userId,
          ipAddress,
          adminUserId: req.user?.id as UserId,
        },
        removeTrustedIpDeps
      )

      match(result)
        .with({ type: 'ok' }, () => {
          res.json({
            message: 'Trusted IP address removed successfully',
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
              message: 'Only admins can manage trusted IPs',
            },
          })
        })
        .with({ type: 'err', error: { type: 'ipNotFound' } }, () => {
          res.status(404).json({
            error: {
              type: 'NOT_FOUND',
              message: 'IP address not found in trusted list',
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

  // Get trusted IPs for a user (admin only)
  router.get(
    '/trusted-ip/:userId',
    authenticate(deps.authConfig),
    authorize('admin'),
    async (req, res) => {
      const userId = req.params.userId as UserId

      const userResult = await deps.userRepository.findById(userId)

      match(userResult)
        .with({ type: 'ok' }, ({ value }) => {
          if (!value) {
            res.status(404).json({
              error: {
                type: 'NOT_FOUND',
                message: 'User not found',
              },
            })
            return
          }

          res.json({
            trustedIpAddresses: value.data.trustedIpAddresses,
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

  // Middleware to check IP restrictions on protected routes
  router.use(
    '/check-ip',
    authenticate(deps.authConfig),
    async (req, res, next) => {
      // Get client IP address
      const ipAddress = req.ip || req.socket.remoteAddress || ''

      const checkIpDeps: CheckIpRestrictionDeps = {
        userRepository: deps.userRepository,
        ipRestrictionEnabled: deps.ipRestrictionEnabled || false,
      }

      const result = await checkIpRestriction(
        {
          userId: req.user?.id as UserId,
          ipAddress,
        },
        checkIpDeps
      )

      match(result)
        .with({ type: 'ok' }, () => {
          next()
        })
        .with({ type: 'err', error: { type: 'ipNotTrusted' } }, ({ error }) => {
          res.status(403).json({
            error: {
              type: 'FORBIDDEN',
              message: `Access denied from IP address: ${error.ipAddress}`,
            },
          })
        })
        .otherwise(() => {
          res.status(500).json({
            error: {
              type: 'INTERNAL_SERVER_ERROR',
              message: 'Internal server error',
            },
          })
        })
    }
  )

  return router
}
