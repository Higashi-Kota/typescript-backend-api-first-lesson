import { type Result, err, ok } from 'neverthrow'
import { z } from 'zod'

// 開始日のスキーマ定義
const StartDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

type StartDate = z.infer<typeof StartDateSchema>

/**
 * 開始日のバリデーション関数
 * @param data 検証する値
 * @returns 検証結果
 */
export const validateStartDate = (
  data: unknown
): Result<StartDate, z.ZodError> => {
  const parsed = StartDateSchema.safeParse(data)

  if (!parsed.success) {
    return err(parsed.error)
  }

  return ok(parsed.data as StartDate)
}
