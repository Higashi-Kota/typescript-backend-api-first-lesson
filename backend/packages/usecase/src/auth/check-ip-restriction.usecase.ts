import type { Result } from '@beauty-salon-backend/domain'
import type { UserId, UserRepository } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'

export type CheckIpRestrictionRequest = {
  userId: UserId
  ipAddress: string
}

export type CheckIpRestrictionError =
  | { type: 'userNotFound'; userId: UserId }
  | { type: 'ipNotTrusted'; ipAddress: string }
  | { type: 'databaseError'; error: unknown }

export type CheckIpRestrictionDeps = {
  userRepository: UserRepository
  ipRestrictionEnabled: boolean
}

export const checkIpRestriction = async (
  request: CheckIpRestrictionRequest,
  deps: CheckIpRestrictionDeps
): Promise<Result<void, CheckIpRestrictionError>> => {
  // If IP restriction is not enabled globally, allow all IPs
  if (!deps.ipRestrictionEnabled) {
    return ok(undefined)
  }

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

  // If user has no trusted IPs configured, allow all IPs
  if (user.data.trustedIpAddresses.length === 0) {
    return ok(undefined)
  }

  // Check if the current IP is in the trusted list
  if (!user.data.trustedIpAddresses.includes(request.ipAddress)) {
    return err({ type: 'ipNotTrusted', ipAddress: request.ipAddress })
  }

  return ok(undefined)
}
