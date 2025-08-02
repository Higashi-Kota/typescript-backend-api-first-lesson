import type { Result } from '@beauty-salon-backend/domain'
import type {
  SessionId,
  SessionRepository,
  UserId,
} from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'

export type RevokeSessionRequest = {
  sessionId: SessionId
  userId: UserId
}

export type RevokeSessionError =
  | { type: 'sessionNotFound' }
  | { type: 'notOwner' }
  | { type: 'databaseError'; error: unknown }

export type RevokeSessionDeps = {
  sessionRepository: SessionRepository
}

export const revokeSession = async (
  request: RevokeSessionRequest,
  deps: RevokeSessionDeps
): Promise<Result<void, RevokeSessionError>> => {
  // Find the session to verify ownership
  const sessionResult = await deps.sessionRepository.findById(request.sessionId)

  if (sessionResult.type === 'err') {
    if (sessionResult.error.type === 'notFound') {
      return err({ type: 'sessionNotFound' })
    }
    return err({ type: 'databaseError', error: sessionResult.error })
  }

  const session = sessionResult.value
  if (session == null) {
    return err({ type: 'sessionNotFound' })
  }

  // Check if the user owns this session
  if (session.userId !== request.userId) {
    return err({ type: 'notOwner' })
  }

  // Delete the session
  const deleteResult = await deps.sessionRepository.delete(request.sessionId)

  if (deleteResult.type === 'err') {
    return err({ type: 'databaseError', error: deleteResult.error })
  }

  return ok(undefined)
}
