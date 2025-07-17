import { getYear, isAfter, isBefore, isValid } from 'date-fns'

import type { AllowFormatValue } from '../types'

import {
  DEFAULT_ENABLE_END_YEAR,
  DEFAULT_ENABLE_START_YEAR,
} from '../constants'

export const isValidDay = (
  inputDay: Date,
  formatString: AllowFormatValue = 'yyyy-MM-dd'
): boolean => {
  if (!isValid(inputDay)) return false

  const year = getYear(inputDay)

  if (year.toString().length !== 4) return false
  if (!(year >= DEFAULT_ENABLE_START_YEAR && year <= DEFAULT_ENABLE_END_YEAR))
    return false

  if (formatString === 'yyyy-MM-dd') {
    if (isBefore(inputDay, new Date(DEFAULT_ENABLE_START_YEAR, 0, 1)))
      return false
    if (isAfter(inputDay, new Date(DEFAULT_ENABLE_END_YEAR, 11, 31)))
      return false
  }

  return true
}
