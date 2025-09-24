import { describe, expect, it } from 'vitest'
import { Result } from '../result/result'

describe('Result', () => {
  describe('success', () => {
    it('should create a success result', () => {
      const data = { value: 42 }
      const result = Result.success(data)

      expect(result).toEqual({
        type: 'success',
        data: { value: 42 },
      })
    })
  })

  describe('error', () => {
    it('should create an error result', () => {
      const error = { message: 'Something went wrong' }
      const result = Result.error(error)

      expect(result).toEqual({
        type: 'error',
        error: { message: 'Something went wrong' },
      })
    })
  })

  describe('isSuccess', () => {
    it('should return true for success result', () => {
      const result = Result.success('data')
      expect(Result.isSuccess(result)).toBe(true)
    })

    it('should return false for error result', () => {
      const result = Result.error('error')
      expect(Result.isError(result)).toBe(true)
    })
  })

  describe('isError', () => {
    it('should return true for error result', () => {
      const result = Result.error('error')
      expect(Result.isError(result)).toBe(true)
    })

    it('should return false for success result', () => {
      const result = Result.success('data')
      expect(Result.isError(result)).toBe(false)
    })
  })

  describe('map', () => {
    it('should transform success data', () => {
      const result = Result.success(5)
      const mapped = Result.map(result, (x) => x * 2)

      expect(mapped).toEqual({
        type: 'success',
        data: 10,
      })
    })

    it('should pass through error unchanged', () => {
      const error = { message: 'error' }
      const result = Result.error(error)
      const mapped = Result.map(result, (x: number) => x * 2)

      expect(mapped).toEqual({
        type: 'error',
        error: { message: 'error' },
      })
    })
  })

  describe('mapError', () => {
    it('should transform error', () => {
      const result = Result.error('original error')
      const mapped = Result.mapError(result, (err) => `Wrapped: ${err}`)

      expect(mapped).toEqual({
        type: 'error',
        error: 'Wrapped: original error',
      })
    })

    it('should pass through success unchanged', () => {
      const result = Result.success(42)
      const mapped = Result.mapError(result, (err) => `Wrapped: ${err}`)

      expect(mapped).toEqual({
        type: 'success',
        data: 42,
      })
    })
  })

  describe('flatMap', () => {
    it('should chain success results', () => {
      const result = Result.success(5)
      const chained = Result.flatMap(result, (x) => Result.success(x * 2))

      expect(chained).toEqual({
        type: 'success',
        data: 10,
      })
    })

    it('should propagate first error', () => {
      const result = Result.error<string>('first error')
      const chained = Result.flatMap(result, (x) => Result.success(x * 2))

      expect(chained).toEqual({
        type: 'error',
        error: 'first error',
      })
    })

    it('should return error from flatMap function', () => {
      const result = Result.success(5)
      const chained = Result.flatMap(result, (_x) =>
        Result.error('operation failed'),
      )

      expect(chained).toEqual({
        type: 'error',
        error: 'operation failed',
      })
    })
  })

  describe('fromPromise', () => {
    it('should wrap resolved promise in success', async () => {
      const promise = Promise.resolve('async data')
      const result = await Result.fromPromise(promise)

      expect(result).toEqual({
        type: 'success',
        data: 'async data',
      })
    })

    it('should wrap rejected promise in error', async () => {
      const promise = Promise.reject(new Error('async error'))
      const result = await Result.fromPromise(promise)

      expect(result.type).toBe('error')
      if (result.type === 'error') {
        expect(result.error.message).toBe('async error')
      }
    })

    it('should handle non-Error rejections', async () => {
      const promise = Promise.reject('string error')
      const result = await Result.fromPromise(promise)

      expect(result.type).toBe('error')
      if (result.type === 'error') {
        expect(result.error.message).toBe('string error')
      }
    })
  })

  describe('unwrap', () => {
    it('should extract data from success result', () => {
      const result = Result.success('data')
      const data = Result.unwrap(result)

      expect(data).toBe('data')
    })

    it('should throw error for error result', () => {
      const result = Result.error('error message')

      expect(() => Result.unwrap(result)).toThrow(
        'Attempted to unwrap an error result',
      )
    })
  })

  describe('unwrapOr', () => {
    it('should extract data from success result', () => {
      const result = Result.success('data')
      const data = Result.unwrapOr(result, 'default')

      expect(data).toBe('data')
    })

    it('should return default value for error result', () => {
      const result = Result.error('error')
      const data = Result.unwrapOr(result, 'default')

      expect(data).toBe('default')
    })
  })

  describe('complex scenarios', () => {
    it('should chain multiple operations', () => {
      const result = Result.success(10)
      const final = Result.flatMap(
        Result.map(result, (x) => x * 2),
        (x) => (x > 15 ? Result.success(x) : Result.error('Too small')),
      )

      expect(final).toEqual({
        type: 'success',
        data: 20,
      })
    })

    it('should handle error propagation in chain', () => {
      const result = Result.success(5)
      const final = Result.flatMap(
        Result.map(result, (x) => x * 2),
        (x) => (x > 15 ? Result.success(x) : Result.error('Too small')),
      )

      expect(final).toEqual({
        type: 'error',
        error: 'Too small',
      })
    })
  })
})
