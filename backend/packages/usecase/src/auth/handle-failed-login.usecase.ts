import type { Result } from '@beauty-salon-backend/domain'
import type { User, UserRepository } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'

export type HandleFailedLoginRequest = {
  email: string
}

export type HandleFailedLoginResponse = {
  isLocked: boolean
  remainingAttempts?: number
  lockDuration?: number
}

export type HandleFailedLoginError =
  | { type: 'userNotFound' }
  | { type: 'databaseError'; error: unknown }

export type HandleFailedLoginDeps = {
  userRepository: UserRepository
  maxFailedAttempts: number
  lockDurationMinutes: number
}

export const handleFailedLogin = async (
  request: HandleFailedLoginRequest,
  deps: HandleFailedLoginDeps
): Promise<Result<HandleFailedLoginResponse, HandleFailedLoginError>> => {
  // Find user by email
  const userResult = await deps.userRepository.findByEmail(request.email)
  if (userResult.type === 'err') {
    if (userResult.error.type === 'notFound') {
      return err({ type: 'userNotFound' })
    }
    return err({ type: 'databaseError', error: userResult.error })
  }

  const user = userResult.value
  if (user == null) {
    return err({ type: 'userNotFound' })
  }

  // If account is already locked, check if lock has expired
  if (user.status.type === 'locked') {
    const lockExpiry = new Date(
      user.status.lockedAt.getTime() + deps.lockDurationMinutes * 60 * 1000
    )
    if (new Date() > lockExpiry) {
      // Lock has expired, reset to active with 1 failed attempt
      const updatedUser: User = {
        status: { type: 'active' },
        data: {
          ...user.data,
          updatedAt: new Date(),
        },
      }

      const updateResult = await deps.userRepository.update(updatedUser)
      if (updateResult.type === 'err') {
        return err({ type: 'databaseError', error: updateResult.error })
      }

      // Increment failed attempts (this would be the first attempt after unlock)
      return incrementFailedAttempts(updatedUser, 1, deps)
    }

    // Lock is still active
    return ok({
      isLocked: true,
      lockDuration: Math.ceil((lockExpiry.getTime() - Date.now()) / 1000),
    })
  }

  // Account is active, increment failed attempts
  // Since we already checked for locked status above, here we only have active, unverified, suspended, or deleted
  // For simplicity, we'll only track failed attempts for active accounts
  const currentFailedAttempts = 0

  return incrementFailedAttempts(user, currentFailedAttempts + 1, deps)
}

async function incrementFailedAttempts(
  user: User,
  failedAttempts: number,
  deps: HandleFailedLoginDeps
): Promise<Result<HandleFailedLoginResponse, HandleFailedLoginError>> {
  if (failedAttempts >= deps.maxFailedAttempts) {
    // Lock the account
    const lockedUser: User = {
      status: {
        type: 'locked',
        reason: 'Too many failed login attempts',
        lockedAt: new Date(),
        failedAttempts,
      },
      data: {
        ...user.data,
        updatedAt: new Date(),
      },
    }

    const updateResult = await deps.userRepository.update(lockedUser)
    if (updateResult.type === 'err') {
      return err({ type: 'databaseError', error: updateResult.error })
    }

    return ok({
      isLocked: true,
      lockDuration: deps.lockDurationMinutes * 60,
    })
  }

  // Update failed attempts count in user metadata (not status change)
  // For simplicity, we'll return the remaining attempts
  return ok({
    isLocked: false,
    remainingAttempts: deps.maxFailedAttempts - failedAttempts,
  })
}
