import type { Result } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import type {
  User,
  UserError,
  UserRepository,
} from '@beauty-salon-backend/domain'
import { validatePassword } from '@beauty-salon-backend/domain'
import { compare, hash } from 'bcrypt'
import { mapRepositoryErrorWithAlreadyExists } from './error-mappers.js'

// Use case input
export interface ResetPasswordInput {
  token: string
  newPassword: string
}

// Use case errors
export type ResetPasswordError =
  | UserError
  | { type: 'invalidToken' }
  | { type: 'tokenExpired' }
  | { type: 'weakPassword'; reason: string }
  | { type: 'passwordReused' }
  | { type: 'hashError'; message: string }
  | { type: 'databaseError'; message: string }
  | { type: 'invalidData'; message: string }

// Dependencies
export interface ResetPasswordDeps {
  userRepository: UserRepository
  sendPasswordChangedEmail: (
    email: string,
    name: string
  ) => Promise<Result<void, { type: 'emailServiceError'; message: string }>>
}

// Hash password
const hashPassword = async (
  password: string
): Promise<Result<string, ResetPasswordError>> => {
  try {
    const passwordHash = await hash(password, 12)
    return ok(passwordHash)
  } catch (_error) {
    return err({ type: 'hashError', message: 'Failed to hash password' })
  }
}

// Check if password matches any in history
const checkPasswordHistory = async (
  password: string,
  passwordHistory: string[]
): Promise<boolean> => {
  for (const oldHash of passwordHistory) {
    const matches = await compare(password, oldHash)
    if (matches) {
      return true
    }
  }
  return false
}

// Use case implementation
export const resetPasswordUseCase = async (
  input: ResetPasswordInput,
  deps: ResetPasswordDeps
): Promise<Result<void, ResetPasswordError>> => {
  // 1. Validate new password strength
  const passwordValidation = validatePassword(input.newPassword)
  if (passwordValidation.type === 'err') {
    return passwordValidation
  }

  // 2. Find user by reset token
  const userResult = await deps.userRepository.findByPasswordResetToken(
    input.token
  )
  if (userResult.type === 'err') {
    // Map all repository errors to invalidToken for security
    return err({ type: 'invalidToken' })
  }

  if (userResult.value == null) {
    return err({ type: 'invalidToken' })
  }

  const user = userResult.value

  // 3. Verify token is valid
  if (user.data.passwordResetStatus.type !== 'requested') {
    return err({ type: 'invalidToken' })
  }

  if (user.data.passwordResetStatus.token !== input.token) {
    return err({ type: 'invalidToken' })
  }

  if (new Date() > user.data.passwordResetStatus.tokenExpiry) {
    return err({ type: 'tokenExpired' })
  }

  // 4. Check password history (last 3 passwords)
  const isReused = await checkPasswordHistory(
    input.newPassword,
    user.data.passwordHistory.slice(0, 3)
  )

  if (isReused) {
    return err({ type: 'passwordReused' })
  }

  // 5. Hash new password
  const hashResult = await hashPassword(input.newPassword)
  if (hashResult.type === 'err') {
    return hashResult
  }

  // 6. Update user with new password
  const updatedUser: User = {
    ...user,
    status: user.status.type === 'locked' ? { type: 'active' } : user.status, // Unlock if locked
    data: {
      ...user.data,
      passwordHash: hashResult.value,
      passwordResetStatus: { type: 'none' },
      passwordHistory: [hashResult.value, ...user.data.passwordHistory].slice(
        0,
        5
      ), // Keep last 5
      lastPasswordChangeAt: new Date(),
      updatedAt: new Date(),
    },
  }

  const updateResult = await deps.userRepository.update(updatedUser)
  if (updateResult.type === 'err') {
    // Map repository errors to use case errors
    if (updateResult.error.type === 'notFound') {
      return err({ type: 'invalidToken' })
    }
    return err(mapRepositoryErrorWithAlreadyExists(updateResult.error))
  }

  // 7. Send password changed notification email
  await deps.sendPasswordChangedEmail(user.data.email, user.data.name)

  return ok(undefined)
}
