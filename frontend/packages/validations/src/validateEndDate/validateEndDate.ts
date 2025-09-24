import { err, ok, type Result } from 'neverthrow'
import { z } from 'zod'

// 終了日のスキーマ定義
const EndDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

type EndDate = z.infer<typeof EndDateSchema>

/**
 * 終了日のバリデーション関数
 * @param data 検証する値
 * @returns 検証結果
 */
export const validateEndDate = (data: unknown): Result<EndDate, z.ZodError> => {
  const parsed = EndDateSchema.safeParse(data)

  if (!parsed.success) {
    return err(parsed.error)
  }

  return ok(parsed.data as EndDate)
}
