import type { Result } from '@beauty-salon-backend/domain'
import type { SessionId, SessionRepository } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'

export type LogoutRequest = {
  sessionId: SessionId
}

export type LogoutError =
  | { type: 'sessionNotFound' }
  | { type: 'databaseError'; error: unknown }

export type LogoutDeps = {
  sessionRepository: SessionRepository
}

export const logout = async (
  request: LogoutRequest,
  deps: LogoutDeps
): Promise<Result<void, LogoutError>> => {
  // Delete the session
  const deleteResult = await deps.sessionRepository.delete(request.sessionId)

  if (deleteResult.type === 'err') {
    if (deleteResult.error.type === 'notFound') {
      return err({ type: 'sessionNotFound' })
    }
    return err({ type: 'databaseError', error: deleteResult.error })
  }

  return ok(undefined)
}
