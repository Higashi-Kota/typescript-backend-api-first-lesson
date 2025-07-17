import { tz } from '@date-fns/tz'

export const toTokyoTime = (date: Date): Date => {
  return tz('Asia/Tokyo')(date)
}

export const fromTokyoTime = (date: Date): Date => {
  return tz('UTC')(date)
}
