import { randomBytes } from 'node:crypto'
import type { Result } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import type {
  User,
  UserError,
  UserId,
  UserRepository,
} from '@beauty-salon-backend/domain'
import { getEmailVerificationTokenExpiry } from '@beauty-salon-backend/domain'
import { mapRepositoryErrorWithAlreadyExists } from './error-mappers.js'

// Use case input
export interface SendEmailVerificationInput {
  userId: UserId
}

// Use case errors
export type SendEmailVerificationError =
  | UserError
  | { type: 'userNotFound' }
  | { type: 'emailAlreadyVerified' }
  | { type: 'tooManyRequests' }
  | { type: 'emailServiceError'; message: string }
  | { type: 'databaseError'; message: string }
  | { type: 'invalidData'; message: string }

// Dependencies
export interface SendEmailVerificationDeps {
  userRepository: UserRepository
  sendEmailVerification: (
    email: string,
    token: string,
    name: string
  ) => Promise<Result<void, { type: 'emailServiceError'; message: string }>>
}

// Generate secure random token
const generateVerificationToken = (): string => {
  return randomBytes(32).toString('hex')
}

// Check if user has recent verification request (within 5 minutes)
const hasRecentVerificationRequest = (user: User): boolean => {
  if (user.status.type !== 'unverified') {
    return false
  }

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
  const tokenCreatedAt = new Date(
    user.status.tokenExpiry.getTime() - getEmailVerificationTokenExpiry()
  )

  return tokenCreatedAt > fiveMinutesAgo
}

// Use case implementation
export const sendEmailVerificationUseCase = async (
  input: SendEmailVerificationInput,
  deps: SendEmailVerificationDeps
): Promise<Result<void, SendEmailVerificationError>> => {
  // 1. Find user by ID
  const userResult = await deps.userRepository.findById(input.userId)
  if (userResult.type === 'err') {
    // Map repository errors to use case errors
    if (userResult.error.type === 'notFound') {
      return err({ type: 'userNotFound' })
    }
    return err(mapRepositoryErrorWithAlreadyExists(userResult.error))
  }

  if (!userResult.value) {
    return err({ type: 'userNotFound' })
  }

  const user = userResult.value

  // 2. Check if email is already verified
  if (user.data.emailVerified) {
    return err({ type: 'emailAlreadyVerified' })
  }

  // 3. Check for recent verification requests
  if (hasRecentVerificationRequest(user)) {
    return err({ type: 'tooManyRequests' })
  }

  // 4. Generate verification token
  const verificationToken = generateVerificationToken()
  const tokenExpiry = new Date(Date.now() + getEmailVerificationTokenExpiry())

  // 5. Update user with verification token
  const updatedUser: User = {
    ...user,
    status: {
      type: 'unverified',
      emailVerificationToken: verificationToken,
      tokenExpiry,
    },
    data: {
      ...user.data,
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

  // 6. Send verification email
  const emailResult = await deps.sendEmailVerification(
    user.data.email,
    verificationToken,
    user.data.name
  )

  if (emailResult.type === 'err') {
    return emailResult
  }

  return ok(undefined)
}
