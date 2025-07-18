import {
  type ApplicationErrorData,
  isApplicationError,
} from '../../_types/applicationError'

import { isNullOrUndefined } from '@beauty-salon-frontend/utils/typeUtil'

const defaultErrorMessage = 'Something went wrong...'

export const displayErrorMessage = (
  error: ApplicationErrorData,
  options?: { customErrorMessage: string }
): string => {
  if (!isNullOrUndefined(options)) return options.customErrorMessage

  if (isApplicationError(error)) return error.message

  return defaultErrorMessage
}
