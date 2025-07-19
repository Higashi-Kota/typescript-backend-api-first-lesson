import type { Result } from '@beauty-salon-backend/domain'
import type { User, UserId, UserRepository } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import speakeasy from 'speakeasy'

export type VerifyTwoFactorRequest = {
  userId: UserId
  code: string
}

export type VerifyTwoFactorResponse = {
  backupCodes: string[]
}

export type VerifyTwoFactorError =
  | { type: 'userNotFound'; userId: UserId }
  | { type: 'invalidCode' }
  | { type: 'twoFactorNotPending' }
  | { type: 'accountNotActive' }
  | { type: 'databaseError'; error: unknown }

export type VerifyTwoFactorDeps = {
  userRepository: UserRepository
  generateBackupCodes: () => string[]
}

export const verifyTwoFactor = async (
  request: VerifyTwoFactorRequest,
  deps: VerifyTwoFactorDeps
): Promise<Result<VerifyTwoFactorResponse, VerifyTwoFactorError>> => {
  // Find user
  const userResult = await deps.userRepository.findById(request.userId)
  if (userResult.type === 'err') {
    if (userResult.error.type === 'notFound') {
      return err({ type: 'userNotFound', userId: request.userId })
    }
    return err({ type: 'databaseError', error: userResult.error })
  }

  const user = userResult.value
  if (!user) {
    return err({ type: 'userNotFound', userId: request.userId })
  }

  // Check if account is active
  if (user.status.type !== 'active') {
    return err({ type: 'accountNotActive' })
  }

  // Check if 2FA is in pending state
  if (user.data.twoFactorStatus.type !== 'pending') {
    return err({ type: 'twoFactorNotPending' })
  }

  // Verify the code
  const isValid = speakeasy.totp.verify({
    secret: user.data.twoFactorStatus.secret,
    encoding: 'base32',
    token: request.code,
    window: 2,
  })

  if (!isValid) {
    return err({ type: 'invalidCode' })
  }

  // Generate backup codes
  const backupCodes = deps.generateBackupCodes()

  // Update user to enable 2FA
  const updatedUser: User = {
    status: user.status,
    data: {
      ...user.data,
      twoFactorStatus: {
        type: 'enabled',
        secret: user.data.twoFactorStatus.secret,
        backupCodes,
      },
      updatedAt: new Date(),
    },
  }

  const updateResult = await deps.userRepository.update(updatedUser)
  if (updateResult.type === 'err') {
    return err({ type: 'databaseError', error: updateResult.error })
  }

  return ok({ backupCodes })
}
