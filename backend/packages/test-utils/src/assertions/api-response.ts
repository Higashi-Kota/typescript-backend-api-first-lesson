import { match } from 'ts-pattern'

export type ApiResponse<T> =
  | { type: 'success'; data: T }
  | {
      type: 'error'
      error: { code: string; message: string; details?: unknown }
    }
  | {
      type: 'validationError'
      errors: Array<{ field: string; message: string }>
    }

export function assertApiResponse<T>(
  response: unknown,
  assertion: (data: T) => void
): void {
  const apiResponse = response as ApiResponse<T>

  match(apiResponse)
    .with({ type: 'success' }, ({ data }) => assertion(data))
    .with({ type: 'error' }, ({ error }) => {
      throw new Error(`Expected success but got error: ${error.message}`)
    })
    .with({ type: 'validationError' }, ({ errors }) => {
      throw new Error(
        `Expected success but got validation errors: ${JSON.stringify(errors)}`
      )
    })
    .exhaustive()
}

export function assertApiError(
  response: unknown,
  expectedErrorCode: string
): void {
  const apiResponse = response as ApiResponse<never>

  match(apiResponse)
    .with({ type: 'error' }, ({ error }) => {
      if (error.code !== expectedErrorCode) {
        throw new Error(
          `Expected error code ${expectedErrorCode} but got ${error.code}`
        )
      }
    })
    .with({ type: 'validationError' }, ({ errors }) => {
      if (expectedErrorCode === 'VALIDATION_ERROR') {
        return
      }
      throw new Error(
        `Expected error but got validation errors: ${JSON.stringify(errors)}`
      )
    })
    .otherwise(() => {
      throw new Error('Expected error response but got success')
    })
}

export function assertValidationError(
  response: unknown,
  expectedFields: string[]
): void {
  const apiResponse = response as ApiResponse<never>

  match(apiResponse)
    .with({ type: 'validationError' }, ({ errors }) => {
      const actualFields = errors.map((e) => e.field)
      const missingFields = expectedFields.filter(
        (f) => !actualFields.includes(f)
      )

      if (missingFields.length > 0) {
        throw new Error(
          `Expected validation errors for fields: ${missingFields.join(', ')}`
        )
      }
    })
    .otherwise(() => {
      throw new Error('Expected validation error response')
    })
}

export function assertTestResult(
  result: { status: number; body: unknown },
  assertion: (res: { status: number; body: unknown }) => void
): void {
  assertion(result)
}
