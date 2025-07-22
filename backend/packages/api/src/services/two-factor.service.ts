/**
 * Two-Factor Authentication Service
 * 二要素認証サービス
 * CLAUDEガイドラインに準拠
 */

import { randomBytes } from 'node:crypto'
import type { Result } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import * as QRCode from 'qrcode'
import * as speakeasy from 'speakeasy'

export type TwoFactorSecret = {
  secret: string
  uri: string
  qrCode: string
  backupCodes: string[]
}

export type TwoFactorServiceError =
  | { type: 'qrCodeGenerationFailed'; message: string }
  | { type: 'invalidToken'; message: string }
  | { type: 'secretGenerationFailed'; message: string }

export class TwoFactorService {
  private readonly appName: string
  private readonly backupCodeCount = 8
  private readonly backupCodeLength = 8

  constructor(appName = 'Beauty Salon App') {
    this.appName = appName
  }

  /**
   * Generate a new 2FA secret with QR code
   */
  async generateSecret(
    userEmail: string
  ): Promise<Result<TwoFactorSecret, TwoFactorServiceError>> {
    try {
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `${this.appName} (${userEmail})`,
        length: 20,
      })

      if (!secret.base32 || !secret.otpauth_url) {
        return err({
          type: 'secretGenerationFailed',
          message: 'Failed to generate 2FA secret',
        })
      }

      // Generate QR code
      const qrCode = await this.generateQRCode(secret.otpauth_url)
      if (qrCode.type === 'err') {
        return err(qrCode.error)
      }

      // Generate backup codes
      const backupCodes = this.generateBackupCodes()

      return ok({
        secret: secret.base32,
        uri: secret.otpauth_url,
        qrCode: qrCode.value,
        backupCodes,
      })
    } catch (error) {
      return err({
        type: 'secretGenerationFailed',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Verify a TOTP token
   */
  verifyToken(
    token: string,
    secret: string
  ): Result<boolean, TwoFactorServiceError> {
    try {
      const isValid = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 2, // Allow 2 time windows before/after for clock skew
      })

      return ok(isValid)
    } catch (error) {
      return err({
        type: 'invalidToken',
        message: error instanceof Error ? error.message : 'Invalid token',
      })
    }
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = []

    for (let i = 0; i < this.backupCodeCount; i++) {
      const code = randomBytes(this.backupCodeLength / 2)
        .toString('hex')
        .toUpperCase()
      codes.push(code)
    }

    return codes
  }

  /**
   * Generate QR code data URL
   */
  private async generateQRCode(
    uri: string
  ): Promise<Result<string, TwoFactorServiceError>> {
    try {
      const qrCode = await QRCode.toDataURL(uri, {
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        width: 256,
      })

      return ok(qrCode)
    } catch (error) {
      return err({
        type: 'qrCodeGenerationFailed',
        message:
          error instanceof Error ? error.message : 'Failed to generate QR code',
      })
    }
  }

  /**
   * Verify backup code
   */
  verifyBackupCode(code: string, validCodes: string[]): boolean {
    const normalizedCode = code.toUpperCase().replace(/\s/g, '')
    return validCodes.includes(normalizedCode)
  }

  /**
   * Generate a recovery code (for account recovery)
   */
  generateRecoveryCode(): string {
    return randomBytes(16).toString('hex').toUpperCase()
  }
}
