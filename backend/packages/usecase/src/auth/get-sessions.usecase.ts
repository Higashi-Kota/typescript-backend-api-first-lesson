import type { Result } from '@beauty-salon-backend/domain'
import type { SessionRepository, UserId } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'

export type GetSessionsRequest = {
  userId: UserId
}

export type GetSessionsResponse = {
  sessions: Array<{
    id: string
    ipAddress: string
    userAgent: string
    createdAt: Date
    lastActivityAt: Date
    expiresAt: Date
    isCurrent: boolean
  }>
  total: number
}

export type GetSessionsError = { type: 'databaseError'; error: unknown }

export type GetSessionsDeps = {
  sessionRepository: SessionRepository
  currentSessionId?: string
}

export const getSessions = async (
  request: GetSessionsRequest,
  deps: GetSessionsDeps
): Promise<Result<GetSessionsResponse, GetSessionsError>> => {
  // Find all sessions for the user
  const sessionsResult = await deps.sessionRepository.findByUserId(
    request.userId
  )

  if (sessionsResult.type === 'err') {
    return err({ type: 'databaseError', error: sessionsResult.error })
  }

  const sessions = sessionsResult.value

  // Filter out expired sessions and map to response format
  const now = new Date()
  const activeSessions = sessions
    .filter((session) => session.expiresAt > now)
    .map((session) => ({
      id: session.id as string,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
      expiresAt: session.expiresAt,
      isCurrent: session.id === deps.currentSessionId,
    }))
    .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())

  return ok({
    sessions: activeSessions,
    total: activeSessions.length,
  })
}
