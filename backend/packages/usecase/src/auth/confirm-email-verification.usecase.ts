import type { Result } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import type {
  User,
  UserError,
  UserRepository,
} from '@beauty-salon-backend/domain'
import { mapRepositoryErrorWithAlreadyExists } from './error-mappers.js'

// Use case input
export interface ConfirmEmailVerificationInput {
  token: string
}

// Use case errors
export type ConfirmEmailVerificationError =
  | UserError
  | { type: 'invalidToken' }
  | { type: 'tokenExpired' }
  | { type: 'emailAlreadyVerified' }
  | { type: 'databaseError'; message: string }
  | { type: 'invalidData'; message: string }

// Dependencies
export interface ConfirmEmailVerificationDeps {
  userRepository: UserRepository
}

// Use case implementation
export const confirmEmailVerificationUseCase = async (
  input: ConfirmEmailVerificationInput,
  deps: ConfirmEmailVerificationDeps
): Promise<Result<void, ConfirmEmailVerificationError>> => {
  // 1. Find user by verification token
  const userResult = await deps.userRepository.findByEmailVerificationToken(
    input.token
  )
  if (userResult.type === 'err') {
    // Map all repository errors to invalidToken for security
    return err({ type: 'invalidToken' })
  }

  if (!userResult.value) {
    return err({ type: 'invalidToken' })
  }

  const user = userResult.value

  // 2. Check if email is already verified
  if (user.data.emailVerified) {
    return err({ type: 'emailAlreadyVerified' })
  }

  // 3. Check if user status is unverified
  if (user.status.type !== 'unverified') {
    return err({ type: 'invalidToken' })
  }

  // 4. Check if token matches
  if (user.status.emailVerificationToken !== input.token) {
    return err({ type: 'invalidToken' })
  }

  // 5. Check if token is expired
  if (new Date() > user.status.tokenExpiry) {
    return err({ type: 'tokenExpired' })
  }

  // 6. Update user to mark email as verified
  const updatedUser: User = {
    status: { type: 'active' }, // Change status to active
    data: {
      ...user.data,
      emailVerified: true,
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

  return ok(undefined)
}
