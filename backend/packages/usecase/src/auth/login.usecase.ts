import type { Result } from '@beauty-salon-backend/domain'
import type {
  Session,
  SessionId,
  SessionRepository,
  User,
  UserId,
  UserRepository,
} from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import { match } from 'ts-pattern'

export type LoginRequest = {
  email: string
  password: string
  twoFactorCode?: string
  ipAddress: string
  userAgent: string
  rememberMe?: boolean
}

export type LoginResponse = {
  userId: UserId
  sessionId: string
  refreshToken: string
  requiresTwoFactor: boolean
}

export type LoginError =
  | { type: 'invalidCredentials' }
  | { type: 'accountLocked'; until?: Date }
  | { type: 'accountSuspended'; reason: string }
  | { type: 'accountDeleted' }
  | { type: 'emailNotVerified' }
  | { type: 'twoFactorRequired' }
  | { type: 'invalidTwoFactorCode' }
  | { type: 'databaseError'; error: unknown }

export type LoginDeps = {
  userRepository: UserRepository
  sessionRepository: SessionRepository
  verifyPassword: (password: string, passwordHash: string) => Promise<boolean>
  verifyTwoFactorCode?: (
    userId: UserId,
    code: string
  ) => Promise<
    Result<
      void,
      { type: 'invalidCode' | 'backupCodeUsed'; remainingCodes?: number }
    >
  >
  generateSessionId: () => string
  generateRefreshToken: () => string
  sessionTtlMinutes: number
}

export const login = async (
  request: LoginRequest,
  deps: LoginDeps
): Promise<Result<LoginResponse, LoginError>> => {
  // Find user by email
  const userResult = await deps.userRepository.findByEmail(request.email)
  if (userResult.type === 'err') {
    if (userResult.error.type === 'notFound') {
      return err({ type: 'invalidCredentials' })
    }
    return err({ type: 'databaseError', error: userResult.error })
  }

  const user = userResult.value
  if (!user) {
    return err({ type: 'invalidCredentials' })
  }

  // Check account status
  const statusCheckResult = match(user.status)
    .with({ type: 'locked' }, (status) =>
      err({
        type: 'accountLocked' as const,
        until: new Date(status.lockedAt.getTime() + 30 * 60 * 1000),
      })
    )
    .with({ type: 'suspended' }, (status) =>
      err({ type: 'accountSuspended' as const, reason: status.reason })
    )
    .with({ type: 'deleted' }, () => err({ type: 'accountDeleted' as const }))
    .with({ type: 'unverified' }, () =>
      err({ type: 'emailNotVerified' as const })
    )
    .with({ type: 'active' }, () => ok(undefined))
    .exhaustive()

  if (statusCheckResult.type === 'err') {
    return statusCheckResult
  }

  // Verify password
  const isPasswordValid = await deps.verifyPassword(
    request.password,
    user.data.passwordHash
  )
  if (!isPasswordValid) {
    // Increment failed attempts if account is active
    if (user.status.type === 'active') {
      await incrementFailedAttempts(user, deps.userRepository)
    }
    return err({ type: 'invalidCredentials' })
  }

  // Check if 2FA is enabled
  if (user.data.twoFactorStatus.type === 'enabled') {
    if (!request.twoFactorCode) {
      return err({ type: 'twoFactorRequired' })
    }

    if (!deps.verifyTwoFactorCode) {
      return err({
        type: 'databaseError',
        error: new Error('2FA verification not configured'),
      })
    }

    const twoFactorResult = await deps.verifyTwoFactorCode(
      user.data.id,
      request.twoFactorCode
    )
    if (twoFactorResult.type === 'err') {
      if (twoFactorResult.error.type === 'invalidCode') {
        return err({ type: 'invalidTwoFactorCode' })
      }
      // If backup code was used, continue with login but note it
    }
  }

  // Reset failed attempts on successful login
  if (user.status.type === 'active') {
    const updatedUser: User = {
      status: user.status,
      data: {
        ...user.data,
        lastLoginAt: new Date(),
        lastLoginIp: request.ipAddress,
        updatedAt: new Date(),
      },
    }
    await deps.userRepository.update(updatedUser)
  }

  // Create session
  const session: Session = {
    id: deps.generateSessionId() as SessionId,
    userId: user.data.id,
    refreshToken: deps.generateRefreshToken(),
    ipAddress: request.ipAddress,
    userAgent: request.userAgent,
    expiresAt: new Date(Date.now() + deps.sessionTtlMinutes * 60 * 1000),
    rememberMe: request.rememberMe ?? false,
    createdAt: new Date(),
    lastActivityAt: new Date(),
  }

  const sessionResult = await deps.sessionRepository.save(session)
  if (sessionResult.type === 'err') {
    return err({ type: 'databaseError', error: sessionResult.error })
  }

  return ok({
    userId: user.data.id,
    sessionId: sessionResult.value.id,
    refreshToken: sessionResult.value.refreshToken,
    requiresTwoFactor: false,
  })
}

async function incrementFailedAttempts(
  user: User,
  userRepository: UserRepository
): Promise<void> {
  const failedAttempts =
    user.status.type === 'locked' ? user.status.failedAttempts + 1 : 1
  const maxFailedAttempts = 5

  if (failedAttempts >= maxFailedAttempts) {
    const lockedUser: User = {
      ...user,
      status: {
        type: 'locked',
        reason: 'Too many failed login attempts',
        lockedAt: new Date(),
        failedAttempts,
      },
      data: {
        ...user.data,
        updatedAt: new Date(),
      },
    }
    await userRepository.update(lockedUser)
  }
}
