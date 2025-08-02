import type { Result } from '@beauty-salon-backend/domain'
import type { User, UserId, UserRepository } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'

export type AddTrustedIpRequest = {
  userId: UserId
  ipAddress: string
  adminUserId: UserId
}

export type AddTrustedIpError =
  | { type: 'userNotFound'; userId: UserId }
  | { type: 'adminNotFound'; adminUserId: UserId }
  | { type: 'notAdmin' }
  | { type: 'invalidIpAddress' }
  | { type: 'ipAlreadyTrusted' }
  | { type: 'maxTrustedIpsReached' }
  | { type: 'databaseError'; error: unknown }

export type AddTrustedIpDeps = {
  userRepository: UserRepository
  maxTrustedIps: number
}

export const addTrustedIp = async (
  request: AddTrustedIpRequest,
  deps: AddTrustedIpDeps
): Promise<Result<void, AddTrustedIpError>> => {
  // Validate IP address format
  if (!isValidIpAddress(request.ipAddress)) {
    return err({ type: 'invalidIpAddress' })
  }

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

  // Find user to update
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

  // Check if IP is already trusted
  if (user.data.trustedIpAddresses.includes(request.ipAddress)) {
    return err({ type: 'ipAlreadyTrusted' })
  }

  // Check max trusted IPs limit
  if (user.data.trustedIpAddresses.length >= deps.maxTrustedIps) {
    return err({ type: 'maxTrustedIpsReached' })
  }

  // Add the IP address
  const updatedUser: User = {
    status: user.status,
    data: {
      ...user.data,
      trustedIpAddresses: [...user.data.trustedIpAddresses, request.ipAddress],
      updatedAt: new Date(),
    },
  }

  const updateResult = await deps.userRepository.update(updatedUser)
  if (updateResult.type === 'err') {
    return err({ type: 'databaseError', error: updateResult.error })
  }

  return ok(undefined)
}

// Simple IP address validation (IPv4 and IPv6)
function isValidIpAddress(ip: string): boolean {
  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/
  if (ipv4Pattern.test(ip)) {
    const parts = ip.split('.')
    return parts.every((part) => {
      const num = Number.parseInt(part, 10)
      return num >= 0 && num <= 255
    })
  }

  // IPv6 pattern (simplified)
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/
  return ipv6Pattern.test(ip)
}
