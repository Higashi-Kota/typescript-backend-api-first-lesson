/**
 * User Domain Model
 * User authentication and authorization
 */

import type { components } from '@beauty-salon-backend/generated'
import { match } from 'ts-pattern'
import type { Brand } from '../shared/brand'
import type { DomainError, ValidationError } from '../shared/errors'
import type { Result } from '../shared/result'
import { err, ok } from '../shared/result'

// Brand the ID types for type safety
export type UserId = Brand<string, 'UserId'>

// Domain User Model - TODO: extend from generated type when available
export interface User extends Omit<components['schemas']['Models.User'], 'id'> {
  id: UserId
  // Additional fields from DB not in API
  passwordHash?: string
  refreshToken?: string
  refreshTokenExpiry?: string
}

// Session type for auth
export interface Session {
  id: string
  userId: UserId
  token: string
  expiresAt: string
}

// Placeholder types for repositories
export type UserState =
  | { type: 'active'; user: User }
  | { type: 'inactive'; user: User; deactivatedAt: string; reason: string }
  | {
      type: 'suspended'
      user: User
      suspendedAt: string
      suspendedUntil: string
      reason: string
    }
  | { type: 'locked'; user: User; lockedAt: string; failedAttempts: number }
  | { type: 'pending_verification'; user: User; verificationToken: string }
  | { type: 'deleted'; userId: UserId; deletedAt: string; deletedBy: string }
export type UserOperationResult =
  | { type: 'created'; user: User }
  | { type: 'updated'; user: User; changes: string[] }
  | { type: 'activated'; user: User }
  | { type: 'deactivated'; user: User; reason: string }
  | { type: 'suspended'; user: User; until: string; reason: string }
  | { type: 'locked'; user: User; reason: string }
  | { type: 'unlocked'; user: User }
  | { type: 'deleted'; userId: UserId }
  | { type: 'email_verified'; user: User }
  | { type: 'password_changed'; user: User }
  | { type: 'two_factor_enabled'; user: User; backupCodes: string[] }
  | { type: 'two_factor_disabled'; user: User }
  | { type: 'validation_failed'; errors: ValidationError[] }
  | { type: 'not_found'; userId: UserId }
  | { type: 'duplicate_email'; email: string }
  | { type: 'invalid_credentials' }
  | { type: 'unauthorized'; action: string }
  | { type: 'error'; error: DomainError }
export type UserSearchResult =
  | { type: 'found'; users: User[]; totalCount: number }
  | { type: 'empty'; query: UserSearchQuery }
  | { type: 'error'; error: DomainError }
export type UserEvent =
  | {
      type: 'user_created'
      user: User
      createdBy: string
      timestamp: string
    }
  | {
      type: 'user_updated'
      userId: UserId
      changes: UserChanges
      updatedBy: string
      timestamp: string
    }
  | {
      type: 'user_logged_in'
      userId: UserId
      ipAddress: string
      userAgent: string
      timestamp: string
    }
  | {
      type: 'user_logged_out'
      userId: UserId
      timestamp: string
    }
  | {
      type: 'user_password_changed'
      userId: UserId
      changedBy: string
      timestamp: string
    }
  | {
      type: 'user_email_verified'
      userId: UserId
      timestamp: string
    }
  | {
      type: 'user_locked'
      userId: UserId
      reason: string
      timestamp: string
    }
  | {
      type: 'user_unlocked'
      userId: UserId
      unlockedBy: string
      timestamp: string
    }
  | {
      type: 'two_factor_enabled'
      userId: UserId
      timestamp: string
    }
  | {
      type: 'two_factor_disabled'
      userId: UserId
      timestamp: string
    }
  | {
      type: 'failed_login_attempt'
      email: string
      ipAddress: string
      timestamp: string
    }

export interface UserSearchQuery {
  email?: string
  name?: string
  role?: string
  isActive?: boolean
  createdFrom?: string
  createdTo?: string
}

export interface UserChanges {
  email?: { from: string; to: string }
  name?: { from: string | undefined; to: string | undefined }
  role?: { from: string; to: string }
  isActive?: { from: boolean; to: boolean }
}

// Re-export related types from generated schemas
export type UserRole = components['schemas']['Models.UserRole']
export type UserAccountStatus =
  components['schemas']['Models.UserAccountStatus']

// Business Logic Functions

/**
 * Validate user data
 */
export const validateUser = (
  user: Partial<User>
): Result<User, ValidationError[]> => {
  const errors: ValidationError[] = []

  if (!user.email) {
    errors.push({ field: 'email', message: 'Email is required' })
  } else if (!isValidEmail(user.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' })
  }

  if (user.role && !isValidRole(user.role)) {
    errors.push({ field: 'role', message: 'Invalid role' })
  }

  if (errors.length > 0) {
    return err(errors)
  }

  return ok(user as User)
}

/**
 * Check if email is valid
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Check if role is valid
 */
export const isValidRole = (role: string): boolean => {
  const validRoles = [
    'super_admin',
    'admin',
    'salon_owner',
    'staff',
    'customer',
  ]
  return validRoles.includes(role)
}

/**
 * Check if user can perform action based on role
 */
export const canPerformAction = (
  userRole: string,
  action: string,
  resource: string
): boolean => {
  // Super admins can do everything
  if (userRole === 'super_admin') {
    return true
  }

  // Define permission matrix
  const permissions: Record<string, Record<string, string[]>> = {
    admin: {
      users: ['create', 'read', 'update', 'delete'],
      salons: ['create', 'read', 'update', 'delete'],
      customers: ['read', 'update'],
      bookings: ['read', 'update', 'cancel'],
    },
    salon_owner: {
      salons: ['read', 'update'],
      staff: ['create', 'read', 'update', 'delete'],
      customers: ['read', 'update'],
      bookings: ['read', 'update', 'cancel'],
      services: ['create', 'read', 'update', 'delete'],
    },
    staff: {
      customers: ['read', 'update'],
      bookings: ['read', 'update'],
      services: ['read'],
    },
    customer: {
      bookings: ['create', 'read', 'cancel'],
      reviews: ['create', 'read', 'update', 'delete'],
    },
  }

  const rolePermissions = permissions[userRole]
  if (!rolePermissions) {
    return false
  }

  const resourcePermissions = rolePermissions[resource]
  if (!resourcePermissions) {
    return false
  }

  return resourcePermissions.includes(action)
}

/**
 * Check if user account is locked
 */
export const isAccountLocked = (user: User): boolean => {
  // Check if status is locked
  return user.status === 'locked'
}

/**
 * Calculate account lock duration based on failed attempts
 */
export const calculateLockDuration = (failedAttempts: number): number => {
  // Progressive lockout: 5 min, 15 min, 30 min, 1 hour, 24 hours
  const durations = [5, 15, 30, 60, 1440]
  const index = Math.min(failedAttempts - 3, durations.length - 1)

  if (failedAttempts < 3) {
    return 0
  }

  const duration = durations[Math.max(0, index)]
  return (duration ?? 5) * 60 * 1000 // Return in milliseconds
}

/**
 * Check if password meets requirements
 */
export const isValidPassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  return passwordRegex.test(password)
}

/**
 * Get user display info
 */
export const getUserDisplayInfo = (state: UserState) => {
  return match(state)
    .with({ type: 'active' }, ({ user }) => ({
      ...user,
      status: 'Active',
      statusColor: 'green',
    }))
    .with({ type: 'inactive' }, ({ user, deactivatedAt, reason }) => ({
      ...user,
      status: `Inactive since ${deactivatedAt}: ${reason}`,
      statusColor: 'gray',
    }))
    .with({ type: 'suspended' }, ({ user, suspendedUntil, reason }) => ({
      ...user,
      status: `Suspended until ${suspendedUntil}: ${reason}`,
      statusColor: 'orange',
    }))
    .with({ type: 'locked' }, ({ user, failedAttempts }) => ({
      ...user,
      status: `Locked (${failedAttempts} failed attempts)`,
      statusColor: 'red',
    }))
    .with({ type: 'pending_verification' }, ({ user }) => ({
      ...user,
      status: 'Pending email verification',
      statusColor: 'yellow',
    }))
    .with({ type: 'deleted' }, ({ userId, deletedAt }) => ({
      id: userId,
      status: `Deleted ${deletedAt}`,
      statusColor: 'black',
    }))
    .exhaustive()
}

/**
 * Generate verification token
 */
export const generateVerificationToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

/**
 * Generate backup codes for 2FA
 */
export const generateBackupCodes = (count = 10): string[] => {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    let code = ''
    for (let j = 0; j < 8; j++) {
      code += Math.floor(Math.random() * 10).toString()
    }
    codes.push(code)
  }
  return codes
}
