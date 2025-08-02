import type { Result } from '@beauty-salon-backend/domain'
import type { User, UserId, UserRepository } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'

export type UnlockAccountRequest = {
  userId: UserId
  adminUserId: UserId
}

export type UnlockAccountError =
  | { type: 'userNotFound'; userId: UserId }
  | { type: 'adminNotFound'; adminUserId: UserId }
  | { type: 'notAdmin' }
  | { type: 'accountNotLocked' }
  | { type: 'databaseError'; error: unknown }

export type UnlockAccountDeps = {
  userRepository: UserRepository
}

export const unlockAccount = async (
  request: UnlockAccountRequest,
  deps: UnlockAccountDeps
): Promise<Result<void, UnlockAccountError>> => {
  // Find admin user
  const adminResult = await deps.userRepository.findById(request.adminUserId)
  if (adminResult.type === 'err') {
    if (adminResult.error.type === 'notFound') {
      return err({ type: 'adminNotFound', adminUserId: request.adminUserId })
    }
    return err({ type: 'databaseError', error: adminResult.error })
  }

  const admin = adminResult.value
  if (admin == null) {
    return err({ type: 'adminNotFound', adminUserId: request.adminUserId })
  }

  // Check if user is admin
  if (admin.data.role !== 'admin') {
    return err({ type: 'notAdmin' })
  }

  // Find user to unlock
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

  // Check if account is locked
  if (user.status.type !== 'locked') {
    return err({ type: 'accountNotLocked' })
  }

  // Unlock the account
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

  return ok(undefined)
}
