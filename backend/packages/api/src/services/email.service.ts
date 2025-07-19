/**
 * Email Service
 * メール送信サービス
 * CLAUDEガイドラインに準拠
 */

import type { Result } from '@beauty-salon-backend/domain'
import { ok } from '@beauty-salon-backend/domain'

// Email service errors
export type EmailServiceError = {
  type: 'emailServiceError'
  message: string
}

// Email template data types
export interface PasswordResetEmailData {
  recipientEmail: string
  recipientName: string
  resetToken: string
  resetUrl: string
}

export interface PasswordChangedEmailData {
  recipientEmail: string
  recipientName: string
}

export interface EmailVerificationData {
  recipientEmail: string
  recipientName: string
  verificationToken: string
  verificationUrl: string
}

export interface AccountLockedEmailData {
  recipientEmail: string
  recipientName: string
  lockReason: string
  unlockTime?: Date
}

export interface TwoFactorEnabledEmailData {
  recipientEmail: string
  recipientName: string
}

export interface LoginAlertEmailData {
  recipientEmail: string
  recipientName: string
  loginIp: string
  loginTime: Date
  userAgent: string
}

// Email service interface
export interface EmailService {
  sendPasswordResetEmail(
    data: PasswordResetEmailData
  ): Promise<Result<void, EmailServiceError>>
  sendPasswordChangedEmail(
    data: PasswordChangedEmailData
  ): Promise<Result<void, EmailServiceError>>
  sendEmailVerification(
    data: EmailVerificationData
  ): Promise<Result<void, EmailServiceError>>
  sendAccountLockedEmail(
    data: AccountLockedEmailData
  ): Promise<Result<void, EmailServiceError>>
  sendTwoFactorEnabledEmail(
    data: TwoFactorEnabledEmailData
  ): Promise<Result<void, EmailServiceError>>
  sendLoginAlertEmail(
    data: LoginAlertEmailData
  ): Promise<Result<void, EmailServiceError>>
}

// Mock email service for development
export class MockEmailService implements EmailService {
  async sendPasswordResetEmail(
    data: PasswordResetEmailData
  ): Promise<Result<void, EmailServiceError>> {
    console.log('📧 Password Reset Email:', {
      to: data.recipientEmail,
      name: data.recipientName,
      resetUrl: data.resetUrl,
    })
    return ok(undefined)
  }

  async sendPasswordChangedEmail(
    data: PasswordChangedEmailData
  ): Promise<Result<void, EmailServiceError>> {
    console.log('📧 Password Changed Email:', {
      to: data.recipientEmail,
      name: data.recipientName,
    })
    return ok(undefined)
  }

  async sendEmailVerification(
    data: EmailVerificationData
  ): Promise<Result<void, EmailServiceError>> {
    console.log('📧 Email Verification:', {
      to: data.recipientEmail,
      name: data.recipientName,
      verificationUrl: data.verificationUrl,
    })
    return ok(undefined)
  }

  async sendAccountLockedEmail(
    data: AccountLockedEmailData
  ): Promise<Result<void, EmailServiceError>> {
    console.log('📧 Account Locked Email:', {
      to: data.recipientEmail,
      name: data.recipientName,
      reason: data.lockReason,
      unlockTime: data.unlockTime,
    })
    return ok(undefined)
  }

  async sendTwoFactorEnabledEmail(
    data: TwoFactorEnabledEmailData
  ): Promise<Result<void, EmailServiceError>> {
    console.log('📧 2FA Enabled Email:', {
      to: data.recipientEmail,
      name: data.recipientName,
    })
    return ok(undefined)
  }

  async sendLoginAlertEmail(
    data: LoginAlertEmailData
  ): Promise<Result<void, EmailServiceError>> {
    console.log('📧 Login Alert Email:', {
      to: data.recipientEmail,
      name: data.recipientName,
      ip: data.loginIp,
      time: data.loginTime,
      userAgent: data.userAgent,
    })
    return ok(undefined)
  }
}

// Create email service wrappers for use cases
export const createEmailServiceWrappers = (
  emailService: EmailService,
  baseUrl: string
) => {
  const sendPasswordResetEmail = async (
    email: string,
    token: string,
    name: string
  ): Promise<Result<void, EmailServiceError>> => {
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`
    return emailService.sendPasswordResetEmail({
      recipientEmail: email,
      recipientName: name,
      resetToken: token,
      resetUrl,
    })
  }

  const sendPasswordChangedEmail = async (
    email: string,
    name: string
  ): Promise<Result<void, EmailServiceError>> => {
    return emailService.sendPasswordChangedEmail({
      recipientEmail: email,
      recipientName: name,
    })
  }

  const sendEmailVerification = async (
    email: string,
    token: string,
    name: string
  ): Promise<Result<void, EmailServiceError>> => {
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${token}`
    return emailService.sendEmailVerification({
      recipientEmail: email,
      recipientName: name,
      verificationToken: token,
      verificationUrl,
    })
  }

  return {
    sendPasswordResetEmail,
    sendPasswordChangedEmail,
    sendEmailVerification,
  }
}
