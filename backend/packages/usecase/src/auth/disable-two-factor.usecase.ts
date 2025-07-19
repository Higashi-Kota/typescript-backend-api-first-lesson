import type { Result } from '@beauty-salon-backend/domain'
import type { User, UserId, UserRepository } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import speakeasy from 'speakeasy'

export type DisableTwoFactorRequest = {
  userId: UserId
  password: string
  code: string
}

export type DisableTwoFactorError =
  | { type: 'userNotFound'; userId: UserId }
  | { type: 'invalidPassword' }
  | { type: 'invalidCode' }
  | { type: 'twoFactorNotEnabled' }
  | { type: 'accountNotActive' }
  | { type: 'databaseError'; error: unknown }

export type DisableTwoFactorDeps = {
  userRepository: UserRepository
  verifyPassword: (password: string, passwordHash: string) => Promise<boolean>
}

export const disableTwoFactor = async (
  request: DisableTwoFactorRequest,
  deps: DisableTwoFactorDeps
): Promise<Result<void, DisableTwoFactorError>> => {
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

  // Check if 2FA is enabled
  if (user.data.twoFactorStatus.type !== 'enabled') {
    return err({ type: 'twoFactorNotEnabled' })
  }

  // Verify password
  const isPasswordValid = await deps.verifyPassword(
    request.password,
    user.data.passwordHash
  )
  if (!isPasswordValid) {
    return err({ type: 'invalidPassword' })
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

  // Update user to disable 2FA
  const updatedUser: User = {
    status: user.status,
    data: {
      ...user.data,
      twoFactorStatus: { type: 'disabled' },
      updatedAt: new Date(),
    },
  }

  const updateResult = await deps.userRepository.update(updatedUser)
  if (updateResult.type === 'err') {
    return err({ type: 'databaseError', error: updateResult.error })
  }

  return ok(undefined)
}
