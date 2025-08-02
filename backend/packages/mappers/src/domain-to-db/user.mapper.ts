/**
 * User Domain to DB Mappers
 * ドメインモデルからDBエンティティへの変換
 */

import type { InferInsertModel } from '@beauty-salon-backend/database'
import type { users } from '@beauty-salon-backend/database'
import type { User } from '@beauty-salon-backend/domain'
import { match } from 'ts-pattern'

// DB Insert/Update Types - Drizzle ORMから自動推論
export type DbNewUser = InferInsertModel<typeof users>
export type DbUpdateUser = Partial<Omit<DbNewUser, 'id'>>

/**
 * ドメインモデルからDB挿入用モデルへの変換
 * @param user ドメインモデルのUser
 * @returns DB挿入用のUserデータ（Drizzle推論型に準拠）
 */
export const mapDomainUserToDbInsert = (user: User): DbNewUser => {
  const { status, data } = user

  const lockedAt = match(status)
    .with({ type: 'locked' }, ({ lockedAt }) => lockedAt.toISOString())
    .otherwise(() => null)

  const emailVerificationToken = match(status)
    .with(
      { type: 'unverified' },
      ({ emailVerificationToken }) => emailVerificationToken
    )
    .otherwise(() => null)

  const emailVerificationTokenExpiry = match(status)
    .with({ type: 'unverified' }, ({ tokenExpiry }) =>
      tokenExpiry.toISOString()
    )
    .otherwise(() => null)

  const twoFactorSecret = match(data.twoFactorStatus)
    .with({ type: 'enabled' }, ({ secret }) => secret)
    .with({ type: 'pending' }, ({ secret }) => secret)
    .otherwise(() => null)

  const backupCodes = match(data.twoFactorStatus)
    .with({ type: 'enabled' }, ({ backupCodes }) => backupCodes)
    .otherwise(() => null)

  const passwordResetToken = match(data.passwordResetStatus)
    .with({ type: 'requested' }, ({ token }) => token)
    .otherwise(() => null)

  const passwordResetTokenExpiry = match(data.passwordResetStatus)
    .with({ type: 'requested' }, ({ tokenExpiry }) => tokenExpiry.toISOString())
    .otherwise(() => null)

  const failedAttempts = match(status)
    .with({ type: 'locked' }, ({ failedAttempts }) => failedAttempts)
    .otherwise(() => 0)

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    password_hash: data.passwordHash,
    // ドメインのUserRoleをDBのroleにマッピング
    role: match(data.role)
      .with('admin', () => 'admin' as const)
      .with('staff', () => 'staff' as const)
      .with('customer', () => 'customer' as const)
      .exhaustive(),
    email_verified: data.emailVerified,
    email_verification_token: emailVerificationToken,
    email_verification_token_expiry: emailVerificationTokenExpiry,
    two_factor_secret: twoFactorSecret,
    backup_codes: backupCodes,
    failed_login_attempts: failedAttempts,
    locked_at: lockedAt,
    password_reset_token: passwordResetToken,
    password_reset_token_expiry: passwordResetTokenExpiry,
    last_password_change_at: data.lastPasswordChangeAt?.toISOString() ?? null,
    password_history:
      data.passwordHistory.length > 0 ? data.passwordHistory : null,
    trusted_ip_addresses:
      data.trustedIpAddresses.length > 0 ? data.trustedIpAddresses : null,
    customer_id: data.customerId ?? null,
    staff_id: data.staffId ?? null,
    created_at: data.createdAt.toISOString(),
    updated_at: data.updatedAt.toISOString(),
  }
}

/**
 * ドメインモデルからDB更新用モデルへの変換
 * @param user ドメインモデルのUser
 * @returns DB更新用のUserデータ（Drizzle推論型に準拠）
 */
export const mapDomainUserToDbUpdate = (user: User): DbUpdateUser => {
  const { status, data } = user

  const lockedAt = match(status)
    .with({ type: 'locked' }, ({ lockedAt }) => lockedAt.toISOString())
    .otherwise(() => null)

  const failedAttempts = match(status)
    .with({ type: 'locked' }, ({ failedAttempts }) => failedAttempts)
    .otherwise(() => 0)

  return {
    email: data.email,
    name: data.name,
    // ドメインのUserRoleをDBのroleにマッピング
    role: match(data.role)
      .with('admin', () => 'admin' as const)
      .with('staff', () => 'staff' as const)
      .with('customer', () => 'customer' as const)
      .exhaustive(),
    email_verified: data.emailVerified,
    locked_at: lockedAt,
    failed_login_attempts: failedAttempts,
    updated_at: data.updatedAt.toISOString(),
  }
}

/**
 * 部分更新用のDB更新モデルへの変換
 * @param updates 更新するフィールドのみを含むオブジェクト
 * @returns DB更新用の部分データ
 */
export const mapPartialUserUpdateToDb = (updates: {
  email?: string
  name?: string
  role?: 'admin' | 'staff' | 'customer'
  emailVerified?: boolean
  twoFactorSecret?: string | null
  lockedAt?: Date | null
  lastLoginAt?: Date
  lastLoginIp?: string
  passwordHash?: string
}): DbUpdateUser => {
  const dbUpdate: DbUpdateUser = {
    updated_at: new Date().toISOString(),
  }

  if (updates.email !== undefined) {
    dbUpdate.email = updates.email
  }
  if (updates.name !== undefined) {
    dbUpdate.name = updates.name
  }
  if (updates.role !== undefined) {
    dbUpdate.role = updates.role
  }
  if (updates.emailVerified !== undefined) {
    dbUpdate.email_verified = updates.emailVerified
  }
  if (updates.twoFactorSecret !== undefined) {
    dbUpdate.two_factor_secret = updates.twoFactorSecret
  }
  if (updates.lockedAt !== undefined) {
    dbUpdate.locked_at = updates.lockedAt?.toISOString() ?? null
  }
  if (updates.passwordHash !== undefined) {
    dbUpdate.password_hash = updates.passwordHash
  }

  return dbUpdate
}
