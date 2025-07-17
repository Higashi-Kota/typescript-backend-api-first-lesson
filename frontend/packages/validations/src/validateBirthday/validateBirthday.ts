import { type Result, err, ok } from 'neverthrow'
import { z } from 'zod'

// 生年月日のスキーマ定義
const BirthdaySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

type Birthday = z.infer<typeof BirthdaySchema>

/**
 * 生年月日のバリデーション関数
 * @param data 検証する値
 * @returns 検証結果
 */
export const validateBirthday = (
  data: unknown
): Result<Birthday, z.ZodError> => {
  const parsed = BirthdaySchema.safeParse(data)

  if (!parsed.success) {
    return err(parsed.error)
  }

  return ok(parsed.data as Birthday)
}
