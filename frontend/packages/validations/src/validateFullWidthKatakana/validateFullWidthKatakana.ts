import { err, ok, type Result } from 'neverthrow'
import { z } from 'zod'

// 全角カタカナのスキーマ定義
const FullWidthKatakanaSchema = z.string().regex(/^[ァ-ヶー]+$/)

type FullWidthKatakana = z.infer<typeof FullWidthKatakanaSchema>

/**
 * 全角カタカナのバリデーション関数
 * @param data 検証する値
 * @returns 検証結果
 */
export const validateFullWidthKatakana = (
  data: unknown,
): Result<FullWidthKatakana, z.ZodError> => {
  const parsed = FullWidthKatakanaSchema.safeParse(data)

  if (!parsed.success) {
    return err(parsed.error)
  }

  return ok(parsed.data as FullWidthKatakana)
}
