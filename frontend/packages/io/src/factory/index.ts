import { SessionRepository } from '../repositories/sessionRepository/sessionRepository'
import type {
  InputRetrieveAuthedUserSession,
  OutputRetrieveAuthedUserSession,
} from './retrieveAuthedUserSession'

export interface SessionFactory {
  retrieveAuthedUserSession(
    payload: InputRetrieveAuthedUserSession,
  ): OutputRetrieveAuthedUserSession
}

export const factory = {
  createRepository: (): SessionFactory => new SessionRepository(),
}
