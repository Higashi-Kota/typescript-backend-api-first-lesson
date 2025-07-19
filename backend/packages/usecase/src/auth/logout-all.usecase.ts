import type { Result } from '@beauty-salon-backend/domain'
import type { SessionRepository, UserId } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'

export type LogoutAllRequest = {
  userId: UserId
}

export type LogoutAllResponse = {
  deletedCount: number
}

export type LogoutAllError = { type: 'databaseError'; error: unknown }

export type LogoutAllDeps = {
  sessionRepository: SessionRepository
}

export const logoutAll = async (
  request: LogoutAllRequest,
  deps: LogoutAllDeps
): Promise<Result<LogoutAllResponse, LogoutAllError>> => {
  // Delete all sessions for the user
  const deleteResult = await deps.sessionRepository.deleteByUserId(
    request.userId
  )

  if (deleteResult.type === 'err') {
    return err({ type: 'databaseError', error: deleteResult.error })
  }

  // The deleteByUserId returns void, so we'll assume all sessions were deleted
  // In a real implementation, this might return the count of deleted sessions
  const sessionsResult = await deps.sessionRepository.findByUserId(
    request.userId
  )
  const deletedCount =
    sessionsResult.type === 'ok' ? sessionsResult.value.length : 0

  return ok({ deletedCount })
}
