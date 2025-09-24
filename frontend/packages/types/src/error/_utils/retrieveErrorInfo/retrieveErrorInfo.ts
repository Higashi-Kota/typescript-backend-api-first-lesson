import { isNullOrUndefined } from '@beauty-salon-frontend/utils'
import { match, P } from 'ts-pattern'
import type { ApplicationErrorData } from '../../_types/applicationError'
import {
  DEFAULT_ERROR_MESSAGE,
  DEFAULT_ERROR_STATUS,
  isApplicationError,
} from '../../_types/applicationError'

export const retrieveErrorInfo = (error: ApplicationErrorData) => {
  return match(error)
    .with(P.when(isApplicationError), (error) => ({
      status: error.status,
      message: error.message,
    }))
    .with(P.when(isNullOrUndefined), () => ({
      status: DEFAULT_ERROR_STATUS,
      message: DEFAULT_ERROR_MESSAGE,
    }))
    .exhaustive()
}
