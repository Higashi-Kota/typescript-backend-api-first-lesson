import type { Result } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import type { UserError, UserRepository } from '@beauty-salon-backend/domain'

// Use case input
export interface VerifyResetTokenInput {
  token: string
}

// Use case errors
export type VerifyResetTokenError =
  | UserError
  | { type: 'invalidToken' }
  | { type: 'tokenExpired' }
  | { type: 'databaseError'; message: string }
  | { type: 'invalidData'; message: string }

// Dependencies
export interface VerifyResetTokenDeps {
  userRepository: UserRepository
}

// Use case implementation
export const verifyResetTokenUseCase = async (
  input: VerifyResetTokenInput,
  deps: VerifyResetTokenDeps
): Promise<Result<void, VerifyResetTokenError>> => {
  // 1. Find user by reset token
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

  // 2. Check if user has a reset token
  if (user.data.passwordResetStatus.type !== 'requested') {
    return err({ type: 'invalidToken' })
  }

  // 3. Check if token matches
  if (user.data.passwordResetStatus.token !== input.token) {
    return err({ type: 'invalidToken' })
  }

  // 4. Check if token is expired
  if (new Date() > user.data.passwordResetStatus.tokenExpiry) {
    return err({ type: 'tokenExpired' })
  }

  return ok(undefined)
}
