import { hasNameProps } from '@beauty-salon-frontend/utils'

export const DEFAULT_ERROR_STATUS = 500
export const DEFAULT_ERROR_MESSAGE = 'Something went wrong...'

export type ApplicationErrorData = ApplicationError | null | undefined

export abstract class ApplicationError extends Error {
  abstract status: number
  cause: unknown

  constructor(message: string, options?: { cause: unknown }) {
    super(message)
    this.cause = options?.cause
  }

  toJSON() {
    return {
      status: this.status,
      name: this.name,
      message: this.message,
      cause: this.cause,
      stack: this.stack,
    }
  }
}

export const isApplicationError = (
  error: unknown
): error is ApplicationError => {
  if (!hasNameProps(error)) return false

  return error instanceof ApplicationError
}
