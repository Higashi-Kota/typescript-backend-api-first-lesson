import { type Result, err, ok } from 'neverthrow'
import { z } from 'zod'

// 半角カタカナのスキーマ定義
const HalfWidthKatakanaSchema = z.string().regex(/^[ｦ-ﾟ]+$/)

type HalfWidthKatakana = z.infer<typeof HalfWidthKatakanaSchema>

/**
 * 半角カタカナのバリデーション関数
 * @param data 検証する値
 * @returns 検証結果
 */
export const validateHalfWidthKatakana = (
  data: unknown
): Result<HalfWidthKatakana, z.ZodError> => {
  const parsed = HalfWidthKatakanaSchema.safeParse(data)

  if (!parsed.success) {
    return err(parsed.error)
  }

  return ok(parsed.data as HalfWidthKatakana)
}
