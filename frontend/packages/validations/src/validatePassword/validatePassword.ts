import { isNullOrUndefined } from '@beauty-salon-frontend/utils/typeUtil'
import { type Result, err, ok } from 'neverthrow'
import { z } from 'zod'

export const PasswordSchema = z
  .string()
  .min(8, '少なくとも8文字以上です')
  .max(20, '多くとも20文字以下です')
  .refine((value) => {
    /**
     * @see https://github.com/knicola/yup-password/blob/master/src/index.ts#L53-L63
     */
    return (
      !isNullOrUndefined(value) && (value.match(/[a-z]/g) ?? []).length >= 1
    )
  }, '少なくとも小文字1文字以上を含めてください')
  .refine((value) => {
    /**
     * @see https://github.com/knicola/yup-password/blob/master/src/index.ts#L65-L75
     */
    return (
      !isNullOrUndefined(value) && (value.match(/[A-Z]/g) ?? []).length >= 1
    )
  }, '少なくとも大文字1文字以上を含めてください')
  .refine((value) => {
    /**
     * @see https://github.com/knicola/yup-password/blob/master/src/index.ts#L77-L87
     */
    return (
      !isNullOrUndefined(value) && (value.match(/[0-9]/g) ?? []).length >= 1
    )
  }, '少なくとも数字1文字以上を含めてください')
  .refine((value) => {
    /**
     * @see https://github.com/knicola/yup-password/blob/master/src/index.ts#L89-L99
     */
    return (
      !isNullOrUndefined(value) &&
      (value.match(/[^a-zA-Z0-9\s]/g) ?? []).length >= 1
    )
  }, '少なくとも記号1文字以上を含めてください')

type Password = z.infer<typeof PasswordSchema>

export const validatePassword = (
  data: unknown
): Result<Password, z.ZodError> => {
  const parsed = PasswordSchema.safeParse(data)

  if (!parsed.success) {
    return err(parsed.error)
  }

  return ok(parsed.data as Password)
}
