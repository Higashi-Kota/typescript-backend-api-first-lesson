/**
 * User DB to Domain Mappers
 * DBエンティティからドメインモデルへの変換
 */

import type { InferSelectModel } from '@beauty-salon-backend/database'
import type { users } from '@beauty-salon-backend/database'
import type { User } from '@beauty-salon-backend/domain'
import { createUserId } from '@beauty-salon-backend/domain'
import { P, match } from 'ts-pattern'

// DB Schema Types - Drizzle ORMから自動推論
export type DbUser = InferSelectModel<typeof users>

/**
 * DBモデルからドメインモデルへの変換
 * @param dbUser DBから取得したUserデータ（Drizzle推論型）
 * @returns ドメインモデルのUser、またはnull（無効なデータの場合）
 */
export const mapDbUserToDomain = (dbUser: DbUser): User | null => {
  const id = createUserId(dbUser.id)
  if (id == null) {
    return null
  }

  // 2FA状態の判定
  const twoFactorStatus: User['data']['twoFactorStatus'] =
    dbUser.two_factor_secret
      ? {
          type: 'enabled',
          secret: dbUser.two_factor_secret,
          backupCodes: Array.isArray(dbUser.backup_codes)
            ? (dbUser.backup_codes as string[])
            : [],
        }
      : { type: 'disabled' }

  // パスワードリセット状態の判定
  const passwordResetStatus: User['data']['passwordResetStatus'] =
    dbUser.password_reset_token && dbUser.password_reset_token_expiry
      ? {
          type: 'requested',
          token: dbUser.password_reset_token,
          tokenExpiry: new Date(dbUser.password_reset_token_expiry),
        }
      : { type: 'none' }

  // アカウント状態の判定
  const accountStatus: User['status'] = match<
    {
      email_verified: boolean
      locked_at: string | null
      email_verification_token: string | null
    },
    User['status']
  >({
    email_verified: dbUser.email_verified,
    locked_at: dbUser.locked_at,
    email_verification_token: dbUser.email_verification_token,
  })
    .with({ locked_at: P.string }, ({ locked_at }) => ({
      type: 'locked' as const,
      reason: 'Too many failed login attempts',
      lockedAt: new Date(locked_at),
      failedAttempts: dbUser.failed_login_attempts,
    }))
    .with(
      { email_verified: false, email_verification_token: P.string },
      ({ email_verification_token }) => ({
        type: 'unverified' as const,
        emailVerificationToken: email_verification_token,
        tokenExpiry: dbUser.email_verification_token_expiry
          ? new Date(dbUser.email_verification_token_expiry)
          : new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours default
      })
    )
    .otherwise(() => ({ type: 'active' as const }))

  return {
    status: accountStatus,
    data: {
      id,
      email: dbUser.email,
      name: dbUser.name,
      passwordHash: dbUser.password_hash,
      // DBのroleをドメインのUserRoleにマッピング
      role: match(dbUser.role)
        .with('admin', () => 'admin' as const)
        .with('staff', () => 'staff' as const)
        .with('customer', () => 'customer' as const)
        .exhaustive(),
      emailVerified: dbUser.email_verified,
      twoFactorStatus,
      passwordResetStatus,
      lastPasswordChangeAt: dbUser.last_password_change_at
        ? new Date(dbUser.last_password_change_at)
        : undefined,
      passwordHistory: Array.isArray(dbUser.password_history)
        ? (dbUser.password_history as string[])
        : [],
      trustedIpAddresses: Array.isArray(dbUser.trusted_ip_addresses)
        ? (dbUser.trusted_ip_addresses as string[])
        : [],
      customerId: dbUser.customer_id ?? undefined,
      staffId: dbUser.staff_id ?? undefined,
      createdAt: new Date(dbUser.created_at),
      updatedAt: new Date(dbUser.updated_at),
    },
  }
}

/**
 * 複数のDBモデルからドメインモデルへの変換
 * @param dbUsers DBから取得した複数のUserデータ
 * @returns ドメインモデルのUser配列（無効なデータは除外）
 */
export const mapDbUsersToDomain = (dbUsers: DbUser[]): User[] => {
  return dbUsers
    .map(mapDbUserToDomain)
    .filter((user): user is User => user !== null)
}
