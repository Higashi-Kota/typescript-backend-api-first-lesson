import { useQuery } from '@tanstack/react-query'

import {
  type Omit,
  isEmpty,
  isNullOrUndefined,
} from '@beauty-salon-frontend/utils'
import type {
  QueryFunction,
  QueryKey,
  UseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query'
import { factory } from '../../factory'
import { setAuthorizationHeader } from '../../libs'
import type { TokenCacheItem } from '../../manager/sessionManager'
import { SessionManager } from '../../manager/sessionManager'
import { SESSION_KEY } from '../../types/session'

const authRepository = factory.createRepository()

type RequiredQueryFnOptions<
  TQueryFnData,
  TError,
  TData,
  TQueryKey extends QueryKey,
> = {
  queryFn: QueryFunction<TQueryFnData, TQueryKey>
} & Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryFn'>

export const useAuthedQuery = <
  TQueryKey extends unknown[],
  TQueryFnData,
  TError,
  TData = TQueryFnData,
>(
  options: RequiredQueryFnOptions<TQueryFnData, TError, TData, TQueryKey>
): UseQueryResult<TData, TError> => {
  const wrappedQueryFn = async (...args: unknown[]) => {
    const tokenCacheManager = new SessionManager<TokenCacheItem, TQueryFnData>(
      SESSION_KEY
    )

    // トークンキャッシュをチェック
    await tokenCacheManager.checkCache({
      buffer: 5 * 60 * 1000, // 5分前に期限切れとみなす
      expiryTime: 60 * 60 * 1000, // 60分後に期限切れ
      fetchFn: async () => {
        const result = await authRepository.retrieveAuthedUserSession({})
        if (result.isErr()) {
          // @ts-expect-error
          return options.queryFn(...args)
        }
        tokenCacheManager.setCacheId(result.value?.tokens?.idToken?.toString())
      },
    })

    const idToken = tokenCacheManager.getCacheId()

    if (isNullOrUndefined(idToken) || isEmpty(idToken)) {
      // @ts-expect-error
      return options.queryFn(...args)
    }

    setAuthorizationHeader(idToken)
    // setGlobalHeaders({
    //   'X-App-Version': env.VITE_APP_VERSION.value,
    // })

    // @ts-expect-error
    return options.queryFn(...args)
  }

  return useQuery<TQueryFnData, TError, TData, TQueryKey>({
    ...options,
    queryFn: wrappedQueryFn,
  })
}
