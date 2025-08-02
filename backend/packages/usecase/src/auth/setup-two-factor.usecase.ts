import type { Result } from '@beauty-salon-backend/domain'
import type { User, UserId, UserRepository } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import qrcode from 'qrcode'
import speakeasy from 'speakeasy'

export type SetupTwoFactorRequest = {
  userId: UserId
  password: string
}

export type SetupTwoFactorResponse = {
  secret: string
  qrCodeUrl: string
  backupCodes: string[]
}

export type SetupTwoFactorError =
  | { type: 'userNotFound'; userId: UserId }
  | { type: 'invalidPassword' }
  | { type: 'twoFactorAlreadyEnabled' }
  | { type: 'accountNotActive' }
  | { type: 'emailNotVerified' }
  | { type: 'databaseError'; error: unknown }

export type SetupTwoFactorDeps = {
  userRepository: UserRepository
  verifyPassword: (password: string, passwordHash: string) => Promise<boolean>
  generateBackupCodes: () => string[]
  appName: string
}

export const setupTwoFactor = async (
  request: SetupTwoFactorRequest,
  deps: SetupTwoFactorDeps
): Promise<Result<SetupTwoFactorResponse, SetupTwoFactorError>> => {
  // Find user
  const userResult = await deps.userRepository.findById(request.userId)
  if (userResult.type === 'err') {
    if (userResult.error.type === 'notFound') {
      return err({ type: 'userNotFound', userId: request.userId })
    }
    return err({ type: 'databaseError', error: userResult.error })
  }

  const user = userResult.value
  if (user == null) {
    return err({ type: 'userNotFound', userId: request.userId })
  }

  // Check if account is active
  if (user.status.type !== 'active') {
    return err({ type: 'accountNotActive' })
  }

  // Check if email is verified
  if (!user.data.emailVerified) {
    return err({ type: 'emailNotVerified' })
  }

  // Check if 2FA is already enabled
  if (user.data.twoFactorStatus.type === 'enabled') {
    return err({ type: 'twoFactorAlreadyEnabled' })
  }

  // Verify password
  const isPasswordValid = await deps.verifyPassword(
    request.password,
    user.data.passwordHash
  )
  if (!isPasswordValid) {
    return err({ type: 'invalidPassword' })
  }

  // Generate secret
  const secret = speakeasy.generateSecret({
    name: `${deps.appName} (${user.data.email})`,
    length: 32,
  })

  // Generate QR code
  const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url ?? '')

  // Generate backup codes
  const backupCodes = deps.generateBackupCodes()

  // Update user with pending 2FA status
  const updatedUser: User = {
    status: user.status,
    data: {
      ...user.data,
      twoFactorStatus: {
        type: 'pending',
        secret: secret.base32,
        qrCodeUrl: qrCodeDataUrl,
      },
      updatedAt: new Date(),
    },
  }

  const updateResult = await deps.userRepository.update(updatedUser)
  if (updateResult.type === 'err') {
    return err({ type: 'databaseError', error: updateResult.error })
  }

  return ok({
    secret: secret.base32,
    qrCodeUrl: qrCodeDataUrl,
    backupCodes,
  })
}
