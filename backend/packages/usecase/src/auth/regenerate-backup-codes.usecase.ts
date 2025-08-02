import type { Result } from '@beauty-salon-backend/domain'
import type { User, UserId, UserRepository } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import speakeasy from 'speakeasy'

export type RegenerateBackupCodesRequest = {
  userId: UserId
  code: string
}

export type RegenerateBackupCodesResponse = {
  backupCodes: string[]
}

export type RegenerateBackupCodesError =
  | { type: 'userNotFound'; userId: UserId }
  | { type: 'invalidCode' }
  | { type: 'twoFactorNotEnabled' }
  | { type: 'accountNotActive' }
  | { type: 'databaseError'; error: unknown }

export type RegenerateBackupCodesDeps = {
  userRepository: UserRepository
  generateBackupCodes: () => string[]
}

export const regenerateBackupCodes = async (
  request: RegenerateBackupCodesRequest,
  deps: RegenerateBackupCodesDeps
): Promise<
  Result<RegenerateBackupCodesResponse, RegenerateBackupCodesError>
> => {
  // Find user
  const userResult = await deps.userRepository.findById(request.userId)
  if (userResult.type === 'err') {
    if (userResult.error.type === 'notFound') {
      return err({ type: 'userNotFound', userId: request.userId })
    }
    return err({ type: 'databaseError', error: userResult.error })
  }

  const user = userResult.value
  if (user == null) {
    return err({ type: 'userNotFound', userId: request.userId })
  }

  // Check if account is active
  if (user.status.type !== 'active') {
    return err({ type: 'accountNotActive' })
  }

  // Check if 2FA is enabled
  if (user.data.twoFactorStatus.type !== 'enabled') {
    return err({ type: 'twoFactorNotEnabled' })
  }

  // Verify the 2FA code
  const isCodeValid = speakeasy.totp.verify({
    secret: user.data.twoFactorStatus.secret,
    encoding: 'base32',
    token: request.code,
    window: 2,
  })

  if (!isCodeValid) {
    return err({ type: 'invalidCode' })
  }

  // Generate new backup codes
  const backupCodes = deps.generateBackupCodes()

  // Update user with new backup codes
  const updatedUser: User = {
    status: user.status,
    data: {
      ...user.data,
      twoFactorStatus: {
        ...user.data.twoFactorStatus,
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
