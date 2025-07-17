import type { ApplicationErrorData } from '@beauty-salon-frontend/types/error'
import type {
  InputRetrieveAuthedUserSession,
  ResponseAuthedUserSessionData,
} from '../../factory/retrieveAuthedUserSession'

import type { ShallowNullish } from '@beauty-salon-frontend/utils/typeUtil'
import { factory } from '../../factory'
import { useAuthedQuery } from '../../hocs'
import { SESSION_KEY } from '../../types/session'

const authRepository = factory.createRepository()
export const useRetrieveAuthedUserSessionHook = (
  payload: ShallowNullish<InputRetrieveAuthedUserSession>
) => {
  const { data, error, refetch } = useAuthedQuery<
    [typeof SESSION_KEY, typeof payload],
    ResponseAuthedUserSessionData,
    ApplicationErrorData
  >({
    queryKey: [SESSION_KEY, payload],
    queryFn: async () => {
      const result = await authRepository.retrieveAuthedUserSession(payload)
      if (result.isErr()) {
        return Promise.reject(result.error)
      }

      return Promise.resolve(result.value)
    },
    enabled: true,
  })

  return { data, error, refetch }
}
