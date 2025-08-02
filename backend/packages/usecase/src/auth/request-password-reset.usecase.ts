import { randomBytes } from 'node:crypto'
import type { Result } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import type {
  User,
  UserError,
  UserRepository,
} from '@beauty-salon-backend/domain'
import { getPasswordResetTokenExpiry } from '@beauty-salon-backend/domain'
import { mapRepositoryErrorWithAlreadyExists } from './error-mappers.js'

// Use case input
export interface RequestPasswordResetInput {
  email: string
}

// Use case errors
export type RequestPasswordResetError =
  | UserError
  | { type: 'userNotFound'; email: string }
  | { type: 'tooManyRequests' }
  | { type: 'emailServiceError'; message: string }
  | { type: 'databaseError'; message: string }
  | { type: 'invalidData'; message: string }

// Dependencies
export interface RequestPasswordResetDeps {
  userRepository: UserRepository
  sendPasswordResetEmail: (
    email: string,
    token: string,
    name: string
  ) => Promise<Result<void, { type: 'emailServiceError'; message: string }>>
}

// Generate secure random token
const generateResetToken = (): string => {
  return randomBytes(32).toString('hex')
}

// Check if user has recent password reset request (within 5 minutes)
const hasRecentPasswordResetRequest = (user: User): boolean => {
  if (user.data.passwordResetStatus.type !== 'requested') {
    return false
  }

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
  const tokenCreatedAt = new Date(
    user.data.passwordResetStatus.tokenExpiry.getTime() -
      getPasswordResetTokenExpiry()
  )

  return tokenCreatedAt > fiveMinutesAgo
}

// Use case implementation
export const requestPasswordResetUseCase = async (
  input: RequestPasswordResetInput,
  deps: RequestPasswordResetDeps
): Promise<Result<void, RequestPasswordResetError>> => {
  // 1. Find user by email
  const userResult = await deps.userRepository.findByEmail(input.email)
  if (userResult.type === 'err') {
    // Map repository errors to use case errors
    if (userResult.error.type === 'notFound') {
      return err({ type: 'userNotFound', email: input.email })
    }
    return err(mapRepositoryErrorWithAlreadyExists(userResult.error))
  }

  if (userResult.value == null) {
    // Return success even if user not found (security best practice)
    // This prevents email enumeration attacks
    return ok(undefined)
  }

  const user = userResult.value

  // 2. Check for recent password reset requests
  if (hasRecentPasswordResetRequest(user)) {
    return err({ type: 'tooManyRequests' })
  }

  // 3. Generate reset token
  const resetToken = generateResetToken()
  const tokenExpiry = new Date(Date.now() + getPasswordResetTokenExpiry())

  // 4. Update user with reset token
  const updatedUser: User = {
    ...user,
    data: {
      ...user.data,
      passwordResetStatus: {
        type: 'requested',
        token: resetToken,
        tokenExpiry,
      },
      updatedAt: new Date(),
    },
  }

  const updateResult = await deps.userRepository.update(updatedUser)
  if (updateResult.type === 'err') {
    // Map repository errors to use case errors
    if (updateResult.error.type === 'notFound') {
      return err({ type: 'userNotFound', email: input.email })
    }
    return err(mapRepositoryErrorWithAlreadyExists(updateResult.error))
  }

  // 5. Send password reset email
  const emailResult = await deps.sendPasswordResetEmail(
    user.data.email,
    resetToken,
    user.data.name
  )

  if (emailResult.type === 'err') {
    return emailResult
  }

  return ok(undefined)
}
