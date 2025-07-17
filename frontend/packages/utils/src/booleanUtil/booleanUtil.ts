import { isEmpty } from '../typeUtil'

export const toBoolean = (data: unknown) => {
  if (data === true) return true
  if (data === 'true') return true
  if (data === '1') return true
  if (data === 1) return true
  if (data === false) return false
  if (data === 'false') return false
  if (data === '0') return false
  if (data === 0) return false
  if (data === null) return false
  if (data === undefined) return false
  if (isEmpty(data)) return false

  return false
}
