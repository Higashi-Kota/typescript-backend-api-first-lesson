import type { Session, User, UserId } from '../models/user'
import type { Brand } from '../shared/brand'
import type { PaginatedResult, PaginationParams } from '../shared/pagination'
import type { Result } from '../shared/result'

// SessionId is not in generated types, define it locally
export type SessionId = Brand<string, 'SessionId'>

// Repository errors
export type UserRepositoryError =
  | { type: 'notFound'; userId?: UserId; email?: string }
  | { type: 'alreadyExists'; email: string }
  | { type: 'databaseError'; message: string }
  | { type: 'invalidData'; message: string }

// Session repository errors
export type SessionRepositoryError =
  | { type: 'notFound'; sessionId?: SessionId; refreshToken?: string }
  | { type: 'databaseError'; message: string }
  | { type: 'invalidData'; message: string }

// Search criteria for users
export interface UserSearchCriteria {
  email?: string
  role?: string
  status?: string
  emailVerified?: boolean
}

// User repository interface
export interface UserRepository {
  // Basic CRUD operations
  findById(id: UserId): Promise<Result<User | null, UserRepositoryError>>
  findByEmail(email: string): Promise<Result<User | null, UserRepositoryError>>
  save(user: User): Promise<Result<User, UserRepositoryError>>
  update(user: User): Promise<Result<User, UserRepositoryError>>
  delete(id: UserId): Promise<Result<void, UserRepositoryError>>

  // Search operations
  search(
    criteria: UserSearchCriteria,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<User>, UserRepositoryError>>

  // Password reset operations
  findByPasswordResetToken(
    token: string
  ): Promise<Result<User | null, UserRepositoryError>>

  // Email verification operations
  findByEmailVerificationToken(
    token: string
  ): Promise<Result<User | null, UserRepositoryError>>
}

// Session repository interface
export interface SessionRepository {
  // Basic CRUD operations
  findById(
    id: SessionId
  ): Promise<Result<Session | null, SessionRepositoryError>>
  findByRefreshToken(
    token: string
  ): Promise<Result<Session | null, SessionRepositoryError>>
  findByUserId(
    userId: UserId
  ): Promise<Result<Session[], SessionRepositoryError>>
  save(session: Session): Promise<Result<Session, SessionRepositoryError>>
  update(session: Session): Promise<Result<Session, SessionRepositoryError>>
  delete(id: SessionId): Promise<Result<void, SessionRepositoryError>>
  deleteByUserId(userId: UserId): Promise<Result<void, SessionRepositoryError>>
  deleteExpired(): Promise<Result<number, SessionRepositoryError>>

  // Count active sessions
  countByUserId(userId: UserId): Promise<Result<number, SessionRepositoryError>>
}
