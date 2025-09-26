import type { ApplicationErrorData } from '@beauty-salon-frontend/types'
import type { Result } from 'neverthrow'
import type { fetchAuthSession } from '../../libs/auth'

export type InputRetrieveAuthedUserSession = Record<string, unknown>

export type ResponseAuthedUserSessionData =
  | Awaited<ReturnType<typeof fetchAuthSession>>
  | null
  | undefined

export type OutputRetrieveAuthedUserSession = Promise<
  Result<ResponseAuthedUserSessionData, ApplicationErrorData>
>
