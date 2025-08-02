import type { Result } from '@beauty-salon-backend/domain'
import type { User, UserId, UserRepository } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import speakeasy from 'speakeasy'

export type VerifyTwoFactorLoginRequest = {
  userId: UserId
  code: string
}

export type VerifyTwoFactorLoginError =
  | { type: 'userNotFound'; userId: UserId }
  | { type: 'invalidCode' }
  | { type: 'twoFactorNotEnabled' }
  | { type: 'accountNotActive' }
  | { type: 'backupCodeUsed'; remainingCodes: number }
  | { type: 'databaseError'; error: unknown }

export type VerifyTwoFactorLoginDeps = {
  userRepository: UserRepository
}

export const verifyTwoFactorLogin = async (
  request: VerifyTwoFactorLoginRequest,
  deps: VerifyTwoFactorLoginDeps
): Promise<Result<void, VerifyTwoFactorLoginError>> => {
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

  // First try to verify as TOTP code
  const isValidTotp = speakeasy.totp.verify({
    secret: user.data.twoFactorStatus.secret,
    encoding: 'base32',
    token: request.code,
    window: 2,
  })

  if (isValidTotp) {
    return ok(undefined)
  }

  // If TOTP fails, check if it's a backup code
  const backupCodeIndex = user.data.twoFactorStatus.backupCodes.indexOf(
    request.code
  )
  if (backupCodeIndex === -1) {
    return err({ type: 'invalidCode' })
  }

  // Remove used backup code
  const remainingBackupCodes = user.data.twoFactorStatus.backupCodes.filter(
    (_, index) => index !== backupCodeIndex
  )

  // Update user with remaining backup codes
  const updatedUser: User = {
    status: user.status,
    data: {
      ...user.data,
      twoFactorStatus: {
        ...user.data.twoFactorStatus,
        backupCodes: remainingBackupCodes,
      },
      updatedAt: new Date(),
    },
  }

  const updateResult = await deps.userRepository.update(updatedUser)
  if (updateResult.type === 'err') {
    return err({ type: 'databaseError', error: updateResult.error })
  }

  return err({
    type: 'backupCodeUsed',
    remainingCodes: remainingBackupCodes.length,
  })
}
