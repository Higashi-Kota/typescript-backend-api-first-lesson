import type { ApplicationErrorData } from '@beauty-salon-frontend/types/error'
import { ResultAsync } from 'neverthrow'
import type { SessionFactory } from '../../factory'
import type {
  InputRetrieveAuthedUserSession,
  OutputRetrieveAuthedUserSession,
  ResponseAuthedUserSessionData,
} from '../../factory/retrieveAuthedUserSession'
import { fetchAuthSession } from '../../libs/auth'

export class SessionRepository implements SessionFactory {
  async retrieveAuthedUserSession(
    _payload: InputRetrieveAuthedUserSession
  ): OutputRetrieveAuthedUserSession {
    async function requestToBE(): Promise<ResponseAuthedUserSessionData> {
      return await fetchAuthSession({ forceRefresh: true })
    }

    return ResultAsync.fromPromise<
      ResponseAuthedUserSessionData,
      ApplicationErrorData
    >(requestToBE(), (e) => e as ApplicationErrorData).map((value) => value)
  }
}
