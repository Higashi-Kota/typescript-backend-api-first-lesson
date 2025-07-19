import type { Result } from '@beauty-salon-backend/domain'
import type { User, UserId, UserRepository } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'

export type RemoveTrustedIpRequest = {
  userId: UserId
  ipAddress: string
  adminUserId: UserId
}

export type RemoveTrustedIpError =
  | { type: 'userNotFound'; userId: UserId }
  | { type: 'adminNotFound'; adminUserId: UserId }
  | { type: 'notAdmin' }
  | { type: 'ipNotFound' }
  | { type: 'databaseError'; error: unknown }

export type RemoveTrustedIpDeps = {
  userRepository: UserRepository
}

export const removeTrustedIp = async (
  request: RemoveTrustedIpRequest,
  deps: RemoveTrustedIpDeps
): Promise<Result<void, RemoveTrustedIpError>> => {
  // Find admin user
  const adminResult = await deps.userRepository.findById(request.adminUserId)
  if (adminResult.type === 'err') {
    if (adminResult.error.type === 'notFound') {
      return err({ type: 'adminNotFound', adminUserId: request.adminUserId })
    }
    return err({ type: 'databaseError', error: adminResult.error })
  }

  const admin = adminResult.value
  if (!admin) {
    return err({ type: 'adminNotFound', adminUserId: request.adminUserId })
  }

  // Check if user is admin
  if (admin.data.role !== 'admin') {
    return err({ type: 'notAdmin' })
  }

  // Find user to update
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

  // Check if IP exists in trusted list
  if (!user.data.trustedIpAddresses.includes(request.ipAddress)) {
    return err({ type: 'ipNotFound' })
  }

  // Remove the IP address
  const updatedUser: User = {
    status: user.status,
    data: {
      ...user.data,
      trustedIpAddresses: user.data.trustedIpAddresses.filter(
        (ip) => ip !== request.ipAddress
      ),
      updatedAt: new Date(),
    },
  }

  const updateResult = await deps.userRepository.update(updatedUser)
  if (updateResult.type === 'err') {
    return err({ type: 'databaseError', error: updateResult.error })
  }

  return ok(undefined)
}
