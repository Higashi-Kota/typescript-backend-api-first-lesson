import {
  isEmpty,
  isNullOrUndefined,
  type Omit,
} from '@beauty-salon-frontend/utils'
import type {
  MutationFunction,
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import { factory } from '../../factory'
import { setAuthorizationHeader } from '../../libs'
import type { TokenCacheItem } from '../../manager/sessionManager'
import { SessionManager } from '../../manager/sessionManager'
import { SESSION_KEY } from '../../types/session'

const authRepository = factory.createRepository()

type RequiredMutationFnOptions<TData, TError, TVariables, TContext> = {
  mutationFn: MutationFunction<TData, TVariables>
} & Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'>

export const useAuthedMutation = <TData, TError, TVariables, TContext>(
  options: RequiredMutationFnOptions<TData, TError, TVariables, TContext>,
): UseMutationResult<TData, TError, TVariables, TContext> => {
  const wrappedMutationFn: MutationFunction<TData, TVariables> = async (
    variables,
    context,
  ) => {
    const tokenCacheManager = new SessionManager<TokenCacheItem, TData>(
      SESSION_KEY,
    )

    // トークンキャッシュをチェック
    await tokenCacheManager.checkCache({
      buffer: 5 * 60 * 1000, // 5分前に期限切れとみなす
      expiryTime: 60 * 60 * 1000, // 60分後に期限切れ
      fetchFn: async () => {
        const result = await authRepository.retrieveAuthedUserSession({})
        if (result.isErr()) {
          return options.mutationFn(variables, context)
        }
        tokenCacheManager.setCacheId(result.value?.tokens?.idToken?.toString())
      },
    })

    const result = await authRepository.retrieveAuthedUserSession({})

    if (result.isErr()) {
      return options.mutationFn(variables, context)
    }

    const idToken = result.value?.tokens?.idToken?.toString()

    if (isNullOrUndefined(idToken) || isEmpty(idToken)) {
      return options.mutationFn(variables, context)
    }

    setAuthorizationHeader(idToken)
    // setGlobalHeaders({
    //   'X-App-Version': env.VITE_APP_VERSION.value,
    // })

    return options.mutationFn(variables, context)
  }

  return useMutation<TData, TError, TVariables, TContext>({
    ...options,
    mutationFn: wrappedMutationFn,
  })
}
