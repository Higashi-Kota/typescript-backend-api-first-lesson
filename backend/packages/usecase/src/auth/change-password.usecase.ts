import type { Result } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import type {
  User,
  UserError,
  UserId,
  UserRepository,
} from '@beauty-salon-backend/domain'
import { validatePassword } from '@beauty-salon-backend/domain'
import { compare, hash } from 'bcrypt'
import { mapRepositoryErrorWithAlreadyExists } from './error-mappers.js'

// Use case input
export interface ChangePasswordInput {
  userId: UserId
  currentPassword: string
  newPassword: string
}

// Use case errors
export type ChangePasswordError =
  | UserError
  | { type: 'userNotFound' }
  | { type: 'invalidPassword' }
  | { type: 'weakPassword'; reason: string }
  | { type: 'passwordReused' }
  | { type: 'hashError'; message: string }
  | { type: 'databaseError'; message: string }
  | { type: 'invalidData'; message: string }

// Dependencies
export interface ChangePasswordDeps {
  userRepository: UserRepository
  sendPasswordChangedEmail: (
    email: string,
    name: string
  ) => Promise<Result<void, { type: 'emailServiceError'; message: string }>>
}

// Hash password
const hashPassword = async (
  password: string
): Promise<Result<string, ChangePasswordError>> => {
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
export const changePasswordUseCase = async (
  input: ChangePasswordInput,
  deps: ChangePasswordDeps
): Promise<Result<void, ChangePasswordError>> => {
  // 1. Validate new password strength
  const passwordValidation = validatePassword(input.newPassword)
  if (passwordValidation.type === 'err') {
    return passwordValidation
  }

  // 2. Find user by ID
  const userResult = await deps.userRepository.findById(input.userId)
  if (userResult.type === 'err') {
    // Map repository errors to use case errors
    if (userResult.error.type === 'notFound') {
      return err({ type: 'userNotFound' })
    }
    return err(mapRepositoryErrorWithAlreadyExists(userResult.error))
  }

  if (userResult.value == null) {
    return err({ type: 'userNotFound' })
  }

  const user = userResult.value

  // 3. Verify current password
  const validPassword = await compare(
    input.currentPassword,
    user.data.passwordHash
  )
  if (!validPassword) {
    return err({ type: 'invalidPassword' })
  }

  // 4. Check if new password is the same as current
  const sameAsCurrentPassword = await compare(
    input.newPassword,
    user.data.passwordHash
  )
  if (sameAsCurrentPassword) {
    return err({ type: 'passwordReused' })
  }

  // 5. Check password history (last 3 passwords)
  const isReused = await checkPasswordHistory(
    input.newPassword,
    user.data.passwordHistory.slice(0, 3)
  )

  if (isReused) {
    return err({ type: 'passwordReused' })
  }

  // 6. Hash new password
  const hashResult = await hashPassword(input.newPassword)
  if (hashResult.type === 'err') {
    return hashResult
  }

  // 7. Update user with new password
  const updatedUser: User = {
    ...user,
    data: {
      ...user.data,
      passwordHash: hashResult.value,
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
      return err({ type: 'userNotFound' })
    }
    return err(mapRepositoryErrorWithAlreadyExists(updateResult.error))
  }

  // 8. Send password changed notification email
  await deps.sendPasswordChangedEmail(user.data.email, user.data.name)

  return ok(undefined)
}
