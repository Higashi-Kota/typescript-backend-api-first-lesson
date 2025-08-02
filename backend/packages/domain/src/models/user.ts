import type { Brand } from '../shared/brand.js'
import { createBrand, createBrandSafe } from '../shared/brand.js'
import type { Result } from '../shared/result.js'
import { err, ok } from '../shared/result.js'

// Brand types for User IDs
export type UserId = Brand<string, 'UserId'>
export type SessionId = Brand<string, 'SessionId'>

// UserID作成関数
export const createUserId = (value: string) => createBrand(value, 'UserId')
export const createUserIdSafe = (value: string) =>
  createBrandSafe(value, 'UserId')

// SessionID作成関数
export const createSessionId = (value: string) =>
  createBrand(value, 'SessionId')
export const createSessionIdSafe = (value: string) =>
  createBrandSafe(value, 'SessionId')

// User role type matching TypeSpec
export type UserRole = 'customer' | 'staff' | 'admin'

// User account status Sum type
export type UserAccountStatus =
  | { type: 'active' }
  | { type: 'unverified'; emailVerificationToken: string; tokenExpiry: Date }
  | { type: 'locked'; reason: string; lockedAt: Date; failedAttempts: number }
  | { type: 'suspended'; reason: string; suspendedAt: Date }
  | { type: 'deleted'; deletedAt: Date }

// Two-factor authentication status Sum type
export type TwoFactorStatus =
  | { type: 'disabled' }
  | { type: 'pending'; secret: string; qrCodeUrl: string }
  | { type: 'enabled'; secret: string; backupCodes: string[] }

// Password reset status Sum type
export type PasswordResetStatus =
  | { type: 'none' }
  | { type: 'requested'; token: string; tokenExpiry: Date }

// User data structure
export interface UserData {
  id: UserId
  email: string
  name: string
  passwordHash: string
  role: UserRole
  emailVerified: boolean
  twoFactorStatus: TwoFactorStatus
  passwordResetStatus: PasswordResetStatus
  lastPasswordChangeAt?: Date
  passwordHistory: string[]
  trustedIpAddresses: string[]
  customerId?: string
  staffId?: string
  createdAt: Date
  updatedAt: Date
  lastLoginAt?: Date
  lastLoginIp?: string
}

// User Sum type with status
export type User = {
  status: UserAccountStatus
  data: UserData
}

// Session data
export interface Session {
  id: SessionId
  userId: UserId
  refreshToken: string
  ipAddress: string
  userAgent: string
  expiresAt: Date
  rememberMe: boolean
  createdAt: Date
  lastActivityAt: Date
}

// User errors
export type UserError =
  | { type: 'invalidEmail'; email: string }
  | { type: 'weakPassword'; reason: string }
  | { type: 'duplicateEmail'; email: string }
  | { type: 'userNotFound'; userId: UserId }
  | { type: 'invalidCredentials' }
  | { type: 'accountLocked'; until?: Date }
  | { type: 'emailNotVerified' }
  | { type: 'invalidToken' }
  | { type: 'tokenExpired' }
  | { type: 'passwordReused' }
  | { type: 'twoFactorRequired' }
  | { type: 'invalidTwoFactorCode' }
  | { type: 'tooManyRequests' }

// Password validation
export const validatePassword = (password: string): Result<void, UserError> => {
  if (password.length < 12) {
    return err({
      type: 'weakPassword',
      reason: 'Password must be at least 12 characters long',
    })
  }

  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password)

  if (!(hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar)) {
    return err({
      type: 'weakPassword',
      reason:
        'Password must contain uppercase, lowercase, numbers, and special characters',
    })
  }

  return ok(undefined)
}

// Email validation
export const validateEmail = (email: string): Result<void, UserError> => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return err({ type: 'invalidEmail', email })
  }
  return ok(undefined)
}

// Check if password has been used before
export const isPasswordReused = (
  passwordHash: string,
  passwordHistory: string[]
): boolean => {
  return passwordHistory.includes(passwordHash)
}

// Check if account is locked
export const isAccountLocked = (status: UserAccountStatus): boolean => {
  return status.type === 'locked'
}

// Check if email is verified
export const isEmailVerified = (user: User): boolean => {
  return user.data.emailVerified
}

// Check if 2FA is enabled
export const isTwoFactorEnabled = (user: User): boolean => {
  return user.data.twoFactorStatus.type === 'enabled'
}

// Get account lock duration (30 minutes)
export const getAccountLockDuration = (): number => {
  return 30 * 60 * 1000 // 30 minutes in milliseconds
}

// Get password reset token expiry (15 minutes)
export const getPasswordResetTokenExpiry = (): number => {
  return 15 * 60 * 1000 // 15 minutes in milliseconds
}

// Get email verification token expiry (24 hours)
export const getEmailVerificationTokenExpiry = (): number => {
  return 24 * 60 * 60 * 1000 // 24 hours in milliseconds
}

// Generate backup codes
export const generateBackupCodes = (count = 8): string[] => {
  const codes: string[] = []
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

  for (let i = 0; i < count; i++) {
    let code = ''
    for (let j = 0; j < 8; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    codes.push(code)
  }

  return codes
}
