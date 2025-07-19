import type { Result } from '@beauty-salon-backend/domain'
import type {
  Session,
  SessionRepository,
  UserRepository,
} from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'

export type RefreshTokenRequest = {
  refreshToken: string
}

export type RefreshTokenResponse = {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export type RefreshTokenError =
  | { type: 'invalidRefreshToken' }
  | { type: 'sessionExpired' }
  | { type: 'userNotFound' }
  | { type: 'accountNotActive' }
  | { type: 'databaseError'; error: unknown }

export type RefreshTokenDeps = {
  sessionRepository: SessionRepository
  userRepository: UserRepository
  generateAccessToken: (userId: string, email: string, role: string) => string
  generateRefreshToken: () => string
  accessTokenExpiresIn: number
  updateSession: (
    session: Session,
    newRefreshToken: string
  ) => Promise<Result<Session, { type: 'updateFailed'; error: unknown }>>
}

export const refreshToken = async (
  request: RefreshTokenRequest,
  deps: RefreshTokenDeps
): Promise<Result<RefreshTokenResponse, RefreshTokenError>> => {
  // Find session by refresh token
  const sessionResult = await deps.sessionRepository.findByRefreshToken(
    request.refreshToken
  )
  if (sessionResult.type === 'err') {
    if (sessionResult.error.type === 'notFound') {
      return err({ type: 'invalidRefreshToken' })
    }
    return err({ type: 'databaseError', error: sessionResult.error })
  }

  const session = sessionResult.value
  if (!session) {
    return err({ type: 'invalidRefreshToken' })
  }

  // Check if session has expired
  if (new Date() > session.expiresAt) {
    // Delete expired session
    await deps.sessionRepository.delete(session.id)
    return err({ type: 'sessionExpired' })
  }

  // Find the user
  const userResult = await deps.userRepository.findById(session.userId)
  if (userResult.type === 'err') {
    return err({ type: 'databaseError', error: userResult.error })
  }

  const user = userResult.value
  if (!user) {
    return err({ type: 'userNotFound' })
  }

  // Check if account is active
  if (user.status.type !== 'active') {
    return err({ type: 'accountNotActive' })
  }

  // Generate new tokens
  const newAccessToken = deps.generateAccessToken(
    user.data.id as string,
    user.data.email,
    user.data.role
  )
  const newRefreshToken = deps.generateRefreshToken()

  // Update session with new refresh token and activity timestamp
  const updatedSession: Session = {
    ...session,
    refreshToken: newRefreshToken,
    lastActivityAt: new Date(),
  }

  const updateResult = await deps.sessionRepository.update(updatedSession)
  if (updateResult.type === 'err') {
    return err({ type: 'databaseError', error: updateResult.error })
  }

  return ok({
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: deps.accessTokenExpiresIn,
  })
}
